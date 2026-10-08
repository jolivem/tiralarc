import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import {
  type ArcherProfile,
  Discipline,
  type FavoriteSite,
  type ProfileInvitation,
} from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AcceptedInvitationDto,
  CreateInvitationDto,
  CreateSiteDto,
  InvitationDto,
  ProfileDto,
  SiteDto,
  UpdateProfileDto,
} from './dto/profile.dto.js';

export const MAX_INVITATIONS = 20;
export const MAX_SITES = 30;

const DISCIPLINES = Object.values(Discipline) as string[];

/** Tokens are 256-bit random values, so a fast hash is sufficient. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function toProfileDto(profile: ArcherProfile | null): ProfileDto {
  const stored: unknown[] = Array.isArray(profile?.disciplines) ? profile.disciplines : [];
  return {
    licenceNumber: profile?.licenceNumber ?? null,
    category: profile?.category ?? null,
    bowType: profile?.bowType ?? null,
    disciplines: stored.filter((d): d is Discipline => DISCIPLINES.includes(d as string)),
  };
}

function toInvitationDto(i: ProfileInvitation): InvitationDto {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    isCoach: i.isCoach,
    status: i.acceptedAt ? 'ACCEPTED' : 'PENDING',
    createdAt: i.createdAt,
  };
}

const toSiteDto = (s: FavoriteSite): SiteDto => ({ id: s.id, label: s.label, url: s.url });

function limitReached(what: string, max: number): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    ErrorCode.LIMIT_REACHED,
    `At most ${max} ${what} per archer`,
  );
}

/** Archer profile: sport details, invited people and favourite websites. Scoped to the owner. */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** An archer who never saved anything has an empty profile. */
  async get(userId: string): Promise<ProfileDto> {
    return toProfileDto(await this.prisma.archerProfile.findUnique({ where: { userId } }));
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileDto> {
    const { licenceNumber, ...rest } = dto;
    const data = {
      ...rest,
      ...(licenceNumber !== undefined && { licenceNumber: licenceNumber?.trim() || null }),
    };
    const profile = await this.prisma.archerProfile.upsert({
      where: { userId },
      create: { userId, disciplines: [], ...data },
      update: data,
    });
    return toProfileDto(profile);
  }

  // ------------------------------------------------------------ invitations

  async listInvitations(userId: string): Promise<InvitationDto[]> {
    const invitations = await this.prisma.profileInvitation.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return invitations.map(toInvitationDto);
  }

  /** Records the guest and emails them a link to accept. */
  async invite(userId: string, dto: CreateInvitationDto): Promise<InvitationDto> {
    const email = dto.email.trim().toLowerCase();
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (email === inviter.email) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANNOT_INVITE_SELF,
        'You cannot invite yourself',
      );
    }
    const existing = await this.prisma.profileInvitation.findMany({
      where: { userId },
      select: { email: true },
    });
    if (existing.some((i) => i.email === email)) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.INVITATION_ALREADY_SENT,
        'This person is already invited',
      );
    }
    if (existing.length >= MAX_INVITATIONS) throw limitReached('invitations', MAX_INVITATIONS);

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.profileInvitation.create({
      data: {
        userId,
        name: dto.name.trim(),
        email,
        isCoach: dto.isCoach ?? false,
        tokenHash: hashToken(token),
      },
    });
    try {
      await this.mail.sendInvitation(
        email,
        inviter.locale,
        inviter.displayName ?? inviter.email,
        token,
      );
    } catch (error) {
      // The guest stays listed as pending; the archer can remove and invite them again.
      this.logger.error(`Could not send invitation ${invitation.id}`, error);
    }
    return toInvitationDto(invitation);
  }

  async removeInvitation(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.profileInvitation.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Invitation not found');
  }

  /** Called by the guest, with the token of the emailed link. Accepting twice is harmless. */
  async acceptInvitation(token: string): Promise<AcceptedInvitationDto> {
    const invitation = await this.prisma.profileInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { displayName: true, email: true } } },
    });
    if (!invitation) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.INVALID_INVITATION_TOKEN,
        'Invalid or withdrawn invitation',
      );
    }
    if (!invitation.acceptedAt) {
      await this.prisma.profileInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    }
    return { invitedBy: invitation.user.displayName ?? invitation.user.email };
  }

  // ------------------------------------------------------------------ sites

  async listSites(userId: string): Promise<SiteDto[]> {
    const sites = await this.prisma.favoriteSite.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return sites.map(toSiteDto);
  }

  async addSite(userId: string, dto: CreateSiteDto): Promise<SiteDto> {
    if ((await this.prisma.favoriteSite.count({ where: { userId } })) >= MAX_SITES) {
      throw limitReached('websites', MAX_SITES);
    }
    const site = await this.prisma.favoriteSite.create({
      data: { userId, label: dto.label.trim(), url: dto.url.trim() },
    });
    return toSiteDto(site);
  }

  async removeSite(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.favoriteSite.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Website not found');
  }
}
