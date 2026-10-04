import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Discipline, Feeling, SessionType } from '../../generated/prisma/client.js';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SESSION_TYPES = Object.values(SessionType);
const DISCIPLINES = Object.values(Discipline);
const FEELINGS = Object.values(Feeling);

/** Max items in "what went well" / "to improve" (3 lines, like the paper sheet). */
export const MAX_LIST_ITEMS = 3;

export class ListSessionsQuery {
  @ApiProperty({ example: '2026-10-01', description: 'First day, inclusive (YYYY-MM-DD).' })
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Last day, inclusive (YYYY-MM-DD). At most 366 days after `from`.',
  })
  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to!: string;
}

export class CreateSessionDto {
  @ApiProperty({ enum: SESSION_TYPES, enumName: 'SessionType' })
  @IsIn(SESSION_TYPES)
  type!: SessionType;

  @ApiProperty({ example: '2026-10-03', description: 'Local date (YYYY-MM-DD).' })
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '18:30',
    description: 'Local time (HH:mm); omitted / null = all-day.',
  })
  @IsOptional()
  @Matches(TIME, { message: 'startTime must be HH:mm' })
  startTime?: string | null;
}

/** PATCH body: every field optional; `null` clears a field. */
export class UpdateSessionDto {
  @ApiPropertyOptional({ enum: SESSION_TYPES, enumName: 'SessionType' })
  @IsOptional()
  @IsIn(SESSION_TYPES)
  type?: SessionType;

  @ApiPropertyOptional({ example: '2026-10-03' })
  @IsOptional()
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '18:30' })
  @IsOptional()
  @Matches(TIME, { message: 'startTime must be HH:mm' })
  startTime?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @ApiPropertyOptional({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  @IsOptional()
  @IsIn(DISCIPLINES)
  discipline?: Discipline | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  distanceMeters?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  arrowCount?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  score?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  objective?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 10,
    description: 'Overall satisfaction.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  satisfaction?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 10,
    description: 'Technique self-assessment.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  technique?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ enum: FEELINGS, enumName: 'Feeling', nullable: true })
  @IsOptional()
  @IsIn(FEELINGS)
  physicalFeeling?: Feeling | null;

  @ApiPropertyOptional({ enum: FEELINGS, enumName: 'Feeling', nullable: true })
  @IsOptional()
  @IsIn(FEELINGS)
  mentalFeeling?: Feeling | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_LIST_ITEMS,
    description: 'What went well (≤ 3 lines).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LIST_ITEMS)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  wentWell?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_LIST_ITEMS,
    description: 'What to improve (≤ 3 lines).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LIST_ITEMS)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  toImprove?: string[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 5000,
    description: 'Notes for the next session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  nextTime?: string | null;
}

/** Calendar entry. */
export class SessionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SESSION_TYPES, enumName: 'SessionType' })
  type!: SessionType;

  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ type: String, nullable: true, example: '18:30' })
  startTime!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  durationMinutes!: number | null;

  @ApiProperty({ type: String, nullable: true })
  location!: string | null;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  discipline!: Discipline | null;

  @ApiProperty({ type: Number, nullable: true })
  score!: number | null;
}

/** Full session sheet. */
export class SessionDto extends SessionSummaryDto {
  @ApiProperty({ type: Number, nullable: true })
  distanceMeters!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  arrowCount!: number | null;

  @ApiProperty({ type: String, nullable: true })
  objective!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  satisfaction!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  technique!: number | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: FEELINGS, enumName: 'Feeling', nullable: true })
  physicalFeeling!: Feeling | null;

  @ApiProperty({ enum: FEELINGS, enumName: 'Feeling', nullable: true })
  mentalFeeling!: Feeling | null;

  @ApiProperty({ type: [String] })
  wentWell!: string[];

  @ApiProperty({ type: [String] })
  toImprove!: string[];

  @ApiProperty({ type: String, nullable: true })
  nextTime!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

/** Values the archer already entered, most frequent first, to speed up repetitive input. */
export class SessionSuggestionsDto {
  @ApiProperty({ type: [String] })
  locations!: string[];

  @ApiProperty({ type: [Number], description: 'Distances in meters.' })
  distances!: number[];

  @ApiProperty({ type: [String] })
  wentWell!: string[];

  @ApiProperty({ type: [String] })
  toImprove!: string[];
}
