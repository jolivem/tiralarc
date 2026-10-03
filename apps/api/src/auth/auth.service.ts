import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto, RegisterDto, TokenPairDto } from './dto/auth.dto.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface ClientInfo {
  deviceName?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  /** Verified when the email is unknown, so response time doesn't reveal which accounts exist. */
  private readonly dummyHash = argon2.hash(randomUUID());

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto, client: ClientInfo): Promise<TokenPairDto> {
    const passwordHash = await argon2.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: normalizeEmail(dto.email), passwordHash, displayName: dto.displayName },
      });
      return this.issueTokens(user, randomUUID(), { ...client, deviceName: dto.deviceName });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, client: ClientInfo): Promise<TokenPairDto> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    const valid = await argon2.verify(user?.passwordHash ?? (await this.dummyHash), dto.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user, randomUUID(), { ...client, deviceName: dto.deviceName });
  }

  /**
   * Rotates a refresh token. Presenting an already-rotated token means it was
   * likely stolen: the whole token family (that login session) is revoked.
   */
  async refresh(refreshToken: string, client: ClientInfo): Promise<TokenPairDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
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
      throw new UnauthorizedException('Refresh token reuse detected');
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

  private async issueTokens(
    user: { id: string; email: string },
    familyId: string,
    client: ClientInfo,
  ): Promise<TokenPairDto> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Refresh tokens are 256-bit random values, so a fast hash is sufficient (no need for argon2). */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
