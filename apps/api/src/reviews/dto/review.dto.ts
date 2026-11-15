import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const REVIEW_DECISIONS = ['PUBLISH', 'REFUSE'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];
export const REVIEW_STATUSES = ['PENDING', 'PUBLISHED', 'REFUSED'] as const;

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Stars given to the app.' })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiProperty({ minLength: 1, maxLength: 1000, description: 'What the user thinks of the app.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comment!: string;
}

/** A published review, as the visitors' home page shows it. */
export class PublicReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  stars!: number;

  @ApiProperty()
  comment!: string;

  @ApiProperty({ example: 'Camille D.', description: 'First name and initial of the last.' })
  authorName!: string;

  @ApiProperty({ example: '2026-11-15', description: 'The day it was written (YYYY-MM-DD).' })
  date!: string;
}

/** The user's own latest review, and when they may write the next one. */
export class MyReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  stars!: number;

  @ApiProperty()
  comment!: string;

  @ApiProperty({ enum: REVIEW_STATUSES, enumName: 'ReviewStatus' })
  status!: (typeof REVIEW_STATUSES)[number];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class MyReviewsDto {
  @ApiProperty({ type: () => MyReviewDto, nullable: true, description: 'The latest one, if any.' })
  last!: MyReviewDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the next review may be written (one a day); null: now.',
  })
  nextAllowedAt!: Date | null;
}

/** What the moderator sees from the emailed link. */
export class ReviewModerationDto extends PublicReviewDto {
  @ApiProperty({ enum: REVIEW_STATUSES, enumName: 'ReviewStatus' })
  status!: (typeof REVIEW_STATUSES)[number];
}

export class ModerateReviewDto {
  @ApiProperty({ description: 'The token of the emailed moderation link.' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token!: string;

  @ApiProperty({ enum: REVIEW_DECISIONS, enumName: 'ReviewDecision' })
  @IsIn(REVIEW_DECISIONS)
  decision!: ReviewDecision;
}
