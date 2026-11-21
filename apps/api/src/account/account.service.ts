import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ApiException, ErrorCode } from '../common/errors.js';
import { PhotosService, photoKeys } from '../journal/photos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { DeleteAccountDto } from './dto/account.dto.js';
import type { ZipEntry } from './zip.js';

/** The archive's JSON file: everything but the photos and score sheets (files of their own). */
export const DATA_FILE = 'mes-donnees.json';

const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

/**
 * The account itself: its deletion (with everything in it, the photos' files included) and the
 * export of all its data (RGPD; the app stores also require deletion to be offered).
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Deletes the account once confirmed (its email, and its password if it has one): its rows go
   * with it (cascades), the photos' files are removed from the storage afterwards. Events it
   * planned as a coach stay in the archers' journals, as theirs.
   */
  async delete(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        "The email typed is not the account's",
      );
    }
    if (
      user.passwordHash &&
      !(dto.password && (await argon2.verify(user.passwordHash, dto.password)))
    ) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Wrong password',
      );
    }
    // Read before the rows cascade away.
    const photos = await this.prisma.sessionPhoto.findMany({
      where: { userId },
      select: { id: true, sessionId: true, userId: true },
    });
    await this.prisma.user.delete({ where: { id: userId } });
    await this.photos.removeFiles(photos);
    this.logger.log(`Account ${userId} deleted (${photos.length} photos)`);
  }

  /**
   * The account's data, as the files of a ZIP archive (`zipStream`), one at a time: the JSON of
   * everything stored about the archer (and as a coach), then each photo and score sheet under
   * the day and id of its event. Read lazily, so the photos never all sit in memory.
   */
  async *export(userId: string): AsyncGenerator<ZipEntry> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        identities: { select: { provider: true, email: true, createdAt: true } },
        archerProfile: true,
        journals: { orderBy: { startDate: 'asc' } },
        customEventTypes: { orderBy: { createdAt: 'asc' } },
        goals: { orderBy: { createdOn: 'asc' } },
        profileInvitations: { orderBy: { createdAt: 'asc' } },
        favoriteSites: true,
        dismissedCompetitions: true,
        appReviews: { orderBy: { createdAt: 'asc' } },
        coachGroups: true,
        sessionComments: {
          include: { session: { select: { date: true, user: { select: { displayName: true } } } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const sessions = await this.prisma.journalSession.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      include: {
        customType: { select: { title: true } },
        plannedBy: { select: { displayName: true } },
        photos: { orderBy: { createdAt: 'asc' } },
        scoreSheet: { select: { createdAt: true } },
        comments: { include: { coach: { select: { displayName: true } } } },
      },
    });
    const folder = (s: { date: Date; id: string }) => `${day(s.date)}_${s.id}`;
    const photoPath = (s: { date: Date; id: string }, photoId: string) =>
      `photos/${folder(s)}/${photoId}.webp`;
    const sheetPath = (s: { date: Date; id: string }) => `feuilles-de-marque/${folder(s)}.pdf`;

    const data = {
      exportedAt: now.toISOString(),
      account: {
        email: user.email,
        displayName: user.displayName,
        locale: user.locale,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt,
        roles: user.roles.map((r) => r.role),
        signInWith: user.identities,
      },
      profile: user.archerProfile && { ...user.archerProfile, userId: undefined },
      journals: user.journals.map((j) => ({
        title: j.title,
        startDate: day(j.startDate),
        endDate: day(j.endDate),
        isDefault: j.isDefault,
        monthThemes: j.monthThemes,
        monthSatisfactions: j.monthSatisfactions,
      })),
      eventTypes: user.customEventTypes.map(({ title, color, icon }) => ({ title, color, icon })),
      events: sessions.map((s) => ({
        ...s,
        userId: undefined,
        customTypeId: undefined,
        plannedById: undefined,
        date: day(s.date),
        scoreSheetCheckedOn: day(s.scoreSheetCheckedOn),
        customType: s.customType?.title ?? null,
        plannedBy: s.plannedBy?.displayName ?? null,
        photos: s.photos.map((p) => photoPath(s, p.id)),
        scoreSheet: s.scoreSheet ? sheetPath(s) : null,
        comments: s.comments.map((c) => ({
          coach: c.coach.displayName,
          text: c.text,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      })),
      goals: user.goals.map((g) => ({
        type: g.type,
        description: g.description,
        createdOn: day(g.createdOn),
        achievedOn: day(g.achievedOn),
      })),
      invitations: user.profileInvitations.map((i) => ({
        name: i.name,
        email: i.email,
        isCoach: i.isCoach,
        coachAccess: i.coachAccess,
        acceptedAt: i.acceptedAt,
        createdAt: i.createdAt,
      })),
      favoriteSites: user.favoriteSites.map(({ label, url }) => ({ label, url })),
      dismissedCompetitions: user.dismissedCompetitions.map((d) => d.fftaCompetitionId),
      reviews: user.appReviews.map(({ stars, comment, status, createdAt }) => ({
        stars,
        comment,
        status,
        createdAt,
      })),
      asCoach: {
        groups: user.coachGroups.map((g) => g.name),
        comments: user.sessionComments.map((c) => ({
          archer: c.session.user.displayName,
          eventDate: day(c.session.date),
          text: c.text,
          createdAt: c.createdAt,
        })),
      },
    };
    yield { name: DATA_FILE, data: Buffer.from(JSON.stringify(data, null, 2)), date: now };

    for (const session of sessions) {
      for (const photo of session.photos) {
        try {
          const image = await this.storage.get(photoKeys(photo).image);
          yield { name: photoPath(session, photo.id), data: image, date: photo.createdAt };
        } catch (error) {
          // A file missing from the storage doesn't stop the export.
          this.logger.warn(`Photo ${photo.id} not exported: ${String(error)}`);
        }
      }
      if (session.scoreSheet) {
        const sheet = await this.prisma.scoreSheet.findUnique({ where: { sessionId: session.id } });
        if (sheet) {
          yield { name: sheetPath(session), data: sheet.pdf, date: sheet.createdAt };
        }
      }
    }
  }
}
