import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ApiException, ErrorCode } from '../common/errors.js';
import { DEFAULT_LOCALE } from '../common/locales.js';
import type { Env } from '../config/env.js';
import { type AuthProvider, Prisma, type Role } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  LoginDto,
  RegisterDto,
  RegistrationDto,
  SocialSignInDto,
  TokenPairDto,
} from './dto/auth.dto.js';
import { IdTokenVerifier } from './id-token-verifier.service.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
}

export interface ClientInfo {
  deviceName?: string;
  userAgent?: string;
}

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

const withRoles = { roles: true } as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Verified when the email is unknown, so response time doesn't reveal which accounts exist. */
  private readonly dummyHash = argon2.hash(randomUUID());

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
    private readonly idTokens: IdTokenVerifier,
  ) {}

  // ---------------------------------------------------------------- email + password

  /** Creates an unverified account and emails a confirmation link. No tokens until verified. */
  async register(dto: RegisterDto): Promise<RegistrationDto> {
    const email = normalizeEmail(dto.email);
    const passwordHash = await argon2.hash(dto.password);
    let user: UserWithRoles;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName?.trim() || null,
          locale: dto.locale ?? DEFAULT_LOCALE,
          roles: { create: dto.roles.map((role) => ({ role })) },
        },
        include: withRoles,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          ErrorCode.EMAIL_TAKEN,
          'Email already registered',
        );
      }
      throw error;
    }

    await this.sendVerificationEmail(user);
    return { email: user.email, verificationRequired: true };
  }

  async login(dto: LoginDto, client: ClientInfo): Promise<TokenPairDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
      include: withRoles,
    });
    const valid = await argon2.verify(user?.passwordHash ?? (await this.dummyHash), dto.password);
    if (!user?.passwordHash || !valid) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }
    // Checked after the password, so it doesn't reveal whether an address is registered.
    if (!user.emailVerifiedAt) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED,
        'Email not verified',
      );
    }
    return this.issueTokens(user, randomUUID(), { ...client, deviceName: dto.deviceName });
  }

  /** Consumes an email verification token and signs the user in. */
  async verifyEmail(token: string, client: ClientInfo): Promise<TokenPairDto> {
    const now = new Date();
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    // Conditional update: a token can only be consumed once, even with concurrent requests.
    const consumed =
      stored && stored.expiresAt > now
        ? await this.prisma.emailVerificationToken.updateMany({
            where: { id: stored.id, usedAt: null },
            data: { usedAt: now },
          })
        : { count: 0 };
    if (!stored || consumed.count === 0) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.INVALID_VERIFICATION_TOKEN,
        'Invalid or expired verification token',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: stored.userId },
      data: { emailVerifiedAt: now },
      include: withRoles,
    });
    return this.issueTokens(user, randomUUID(), client);
  }

  /** Always succeeds, so it can't be used to discover which addresses are registered. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (user && !user.emailVerifiedAt && user.passwordHash) {
      await this.sendVerificationEmail(user);
    }
  }

  // ---------------------------------------------------------------- Google / Apple

  /**
   * Signs in with a Google / Apple ID token, creating the account on first use.
   * An existing account with the same (provider-verified) email is linked.
   */
  async socialSignIn(
    provider: AuthProvider,
    dto: SocialSignInDto,
    client: ClientInfo,
  ): Promise<TokenPairDto> {
    const identity = await this.idTokens.verify(provider, dto.idToken, dto.nonce);
    const session = { ...client, deviceName: dto.deviceName };

    const linked = await this.prisma.userIdentity.findUnique({
      where: { provider_subject: { provider, subject: identity.subject } },
      include: { user: { include: withRoles } },
    });
    if (linked) {
      return this.issueTokens(linked.user, randomUUID(), session);
    }

    if (!identity.email) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_ID_TOKEN,
        'ID token has no email',
      );
    }

    const existing = identity.emailVerified
      ? await this.prisma.user.findUnique({ where: { email: identity.email } })
      : null;
    if (existing) {
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          identities: { create: { provider, subject: identity.subject, email: identity.email } },
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          // An unverified account may have been created by someone else with this address
          // (pre-hijacking): its password can't be trusted, so drop it.
          ...(existing.emailVerifiedAt ? {} : { passwordHash: null }),
        },
        include: withRoles,
      });
      return this.issueTokens(user, randomUUID(), session);
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: identity.email,
          emailVerifiedAt: identity.emailVerified ? new Date() : null,
          displayName: dto.displayName?.trim() || identity.name || null,
          locale: dto.locale ?? DEFAULT_LOCALE,
          roles: { create: (dto.roles ?? []).map((role) => ({ role })) },
          identities: { create: { provider, subject: identity.subject, email: identity.email } },
        },
        include: withRoles,
      });
      return this.issueTokens(user, randomUUID(), session);
    } catch (error) {
      // Same email, but the provider didn't verify it: we won't link automatically.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          ErrorCode.EMAIL_TAKEN,
          'Email already registered',
        );
      }
      throw error;
    }
  }

  isProviderEnabled(provider: AuthProvider): boolean {
    return this.idTokens.isEnabled(provider);
  }

  // ---------------------------------------------------------------- sessions

  /**
   * Rotates a refresh token. Presenting an already-rotated token means it was
   * likely stolen: the whole token family (that login session) is revoked.
   */
  async refresh(refreshToken: string, client: ClientInfo): Promise<TokenPairDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { include: withRoles } },
    });
    if (!stored) {
      throw invalidRefreshToken('Invalid refresh token');
    }
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefreshToken('Refresh token reuse detected');
    }
    if (stored.expiresAt <= new Date()) {
      throw invalidRefreshToken('Refresh token expired');
    }

    const pair = await this.issueTokens(stored.user, stored.familyId, {
      deviceName: stored.deviceName ?? undefined,
      userAgent: client.userAgent,
    });
    const replacement = await this.prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(pair.refreshToken) },
      select: { id: true },
    });
    // Conditional update: if a concurrent request rotated this token first, count is 0.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: replacement.id },
    });
    if (count === 0) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefreshToken('Refresh token reuse detected');
    }
    return pair;
  }

  /** Revokes the session the refresh token belongs to. Idempotent. */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      select: { familyId: true },
    });
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }

  // ---------------------------------------------------------------- internals

  private async sendVerificationEmail(user: { id: string; email: string; locale: string }) {
    const token = randomBytes(32).toString('base64url');
    const ttl = this.config.get('EMAIL_VERIFICATION_TTL', { infer: true });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    try {
      await this.mail.sendEmailVerification(user.email, user.locale, token);
    } catch (error) {
      // The account exists either way; the user can ask for a new link.
      this.logger.error(`Could not send verification email to user ${user.id}`, error);
    }
  }

  private async issueTokens(
    user: { id: string; email: string; roles: { role: Role }[] },
    familyId: string,
    client: ClientInfo,
  ): Promise<TokenPairDto> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role),
    };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessTtl });
    const refreshToken = randomBytes(32).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        deviceName: client.deviceName?.slice(0, 100),
        userAgent: client.userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
      refreshExpiresIn: refreshTtl,
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function invalidRefreshToken(detail: string): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_REFRESH_TOKEN, detail);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Tokens are 256-bit random values, so a fast hash is sufficient (no need for argon2). */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
