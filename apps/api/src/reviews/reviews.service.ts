import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type AppReview, ReviewStatus } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateReviewDto,
  MyReviewsDto,
  PublicReviewDto,
  ReviewDecision,
  ReviewModerationDto,
} from './dto/review.dto.js';

/** One review a day per user. */
const DAY_MS = 24 * 60 * 60 * 1000;
/** The home page shows this many, newest first. */
const SHOWN = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** "Camille Dupré" → "Camille D."; one word as it is; no name: "". */
export function authorNameOf(displayName: string | null): string {
  const [first, last] = (displayName ?? '').trim().split(/\s+/);
  if (!first) return '';
  return last ? `${first} ${last.charAt(0).toLocaleUpperCase('fr')}.` : first;
}

const toPublic = (r: AppReview): PublicReviewDto => ({
  id: r.id,
  stars: r.stars,
  comment: r.comment,
  authorName: r.authorName,
  date: r.createdAt.toISOString().slice(0, 10),
});

/**
 * Users' reviews of the app: stars and a comment, one a day each. Each is emailed to the
 * moderators (REVIEWS_EMAIL) with a link that publishes or refuses it; published ones show on
 * the visitors' home page.
 */
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<MyReviewsDto> {
    const { nextAllowedAt } = await this.mine(userId);
    if (nextAllowedAt) {
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCode.DAILY_LIMIT_REACHED,
        'One review a day',
      );
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const token = randomBytes(32).toString('base64url');
    const review = await this.prisma.appReview.create({
      data: {
        userId,
        stars: dto.stars,
        comment: dto.comment.trim(),
        authorName: authorNameOf(user.displayName) || 'Archer',
        moderationTokenHash: hashToken(token),
      },
    });
    // The review is kept even if the mail fails: it waits, pending.
    await this.mail
      .sendReviewForModeration({ ...toPublic(review), email: user.email }, token)
      .catch((error: unknown) => this.logger.error(`Review ${review.id} not emailed: ${error}`));
    return this.mine(userId);
  }

  /** The user's latest review, and when the next one may be written. */
  async mine(userId: string): Promise<MyReviewsDto> {
    const last = await this.prisma.appReview.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const next = last && new Date(last.createdAt.getTime() + DAY_MS);
    return {
      last: last && {
        stars: last.stars,
        comment: last.comment,
        status: last.status,
        createdAt: last.createdAt,
      },
      nextAllowedAt: next && next > new Date() ? next : null,
    };
  }

  /** The published reviews, the latest first. */
  async published(): Promise<PublicReviewDto[]> {
    const reviews = await this.prisma.appReview.findMany({
      where: { status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: SHOWN,
    });
    return reviews.map(toPublic);
  }

  /** The review an emailed link is about, whatever was decided since. */
  async forModeration(token: string): Promise<ReviewModerationDto> {
    const review = await this.byToken(token);
    return { ...toPublic(review), status: review.status };
  }

  /** Publishes or refuses a pending review; the link works once. */
  async moderate(token: string, decision: ReviewDecision): Promise<void> {
    const review = await this.byToken(token);
    const { count } = await this.prisma.appReview.updateMany({
      where: { id: review.id, status: ReviewStatus.PENDING },
      data: {
        status: decision === 'PUBLISH' ? ReviewStatus.PUBLISHED : ReviewStatus.REFUSED,
        decidedAt: new Date(),
      },
    });
    if (count === 0) throw this.invalidToken();
  }

  private async byToken(token: string): Promise<AppReview> {
    const review = await this.prisma.appReview.findUnique({
      where: { moderationTokenHash: hashToken(token) },
    });
    if (!review) throw this.invalidToken();
    return review;
  }

  private invalidToken() {
    return new ApiException(
      HttpStatus.CONFLICT,
      ErrorCode.INVALID_REVIEW_TOKEN,
      'Unknown moderation link, or the review was already published or refused',
    );
  }
}
