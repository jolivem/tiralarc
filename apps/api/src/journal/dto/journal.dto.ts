import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Discipline, Feeling, SessionType } from '../../generated/prisma/client.js';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const COLOR = /^#[0-9a-f]{6}$/;
const THEME = /^[a-z0-9-]{1,30}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SESSION_TYPES = Object.values(SessionType);
const DISCIPLINES = Object.values(Discipline);
const FEELINGS = Object.values(Feeling);

/** Calendar colours an `OTHER` event can take (palette names; clients pick the shades). */
export const EVENT_COLORS = [
  'gray',
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

/** Pictograms an `OTHER` event can take (clients map each key to their own icon set). */
export const EVENT_ICONS = [
  'NOTE',
  'STAR',
  'FLAG',
  'TOOL',
  'CART',
  'USERS',
  'CAR',
  'MEDICAL',
  'GIFT',
  'HEART',
  'BELL',
  'PIN',
] as const;
export type EventIcon = (typeof EVENT_ICONS)[number];

/** Max items in "what went well" / "to improve" (3 lines, like the paper sheet). */
export const MAX_LIST_ITEMS = 3;

export class CreateJournalDto {
  @ApiProperty({ example: 'Saison 2026-2027', minLength: 1, maxLength: 100 })
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: '2026-09-01', description: 'First day, inclusive (YYYY-MM-DD).' })
  @Matches(DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @ApiProperty({
    example: '2027-08-31',
    description: 'Last day, inclusive (YYYY-MM-DD). Not before `startDate`.',
  })
  @Matches(DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate!: string;
}

/** PATCH body: every field optional. */
export class UpdateJournalDto {
  @ApiPropertyOptional({ example: 'Saison 2026-2027', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'First day, inclusive.' })
  @IsOptional()
  @Matches(DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2027-08-31',
    description: "Last day, inclusive. The period must keep covering the journal's sessions.",
  })
  @IsOptional()
  @Matches(DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}

export const THEME_BANDS = ['top', 'bottom', 'left', 'right'] as const;
export type ThemeBand = (typeof THEME_BANDS)[number];
/** Colouring one decoration takes far fewer; this only bounds the stored size. */
export const MAX_FILLS = 500;

/** One "paint bucket" click on a theme's artwork: the closed area around the point takes the colour. */
export class FillDto {
  @ApiProperty({ enum: THEME_BANDS, enumName: 'ThemeBand', description: 'Which band was clicked.' })
  @IsIn(THEME_BANDS)
  band!: ThemeBand;

  @ApiProperty({
    minimum: 0,
    maximum: 1,
    description: 'Horizontal position in the band image (0 = left).',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 1,
    description: 'Vertical position in the band image (0 = top).',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @ApiProperty({ example: '#e03131', pattern: '^#[0-9a-f]{6}$' })
  @Matches(COLOR, { message: 'color must be #rrggbb' })
  color!: string;
}

export class MonthThemeDto {
  @ApiProperty({ example: '2026-10', description: 'Month (YYYY-MM).' })
  month!: string;

  @ApiProperty({
    example: 'archery',
    description: 'Theme id; each client maps it to its own artwork.',
  })
  theme!: string;

  @ApiProperty({
    type: () => [FillDto],
    description: "The archer's colouring of that month's decoration, in the order it was painted.",
  })
  fills!: FillDto[];
}

export class SetMonthColoringDto {
  @ApiProperty({
    type: () => [FillDto],
    maxItems: MAX_FILLS,
    description: 'Replaces the colouring.',
  })
  @IsArray()
  @ArrayMaxSize(MAX_FILLS)
  @ValidateNested({ each: true })
  @Type(() => FillDto)
  fills!: FillDto[];
}

export class SetMonthThemeDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'archery',
    pattern: '^[a-z0-9-]{1,30}$',
    description:
      'Theme id, or null to remove the decoration of that month. Changing it clears the colouring.',
  })
  @ValidateIf((_, value) => value !== null)
  @Matches(THEME, { message: 'theme must be a lowercase slug' })
  theme!: string | null;
}

/** A season's journal. */
export class JournalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Saison 2026-2027' })
  title!: string;

  @ApiProperty({ example: '2026-09-01' })
  startDate!: string;

  @ApiProperty({ example: '2027-08-31' })
  endDate!: string;

  @ApiProperty({
    type: () => [MonthThemeDto],
    description: 'Decoration of the calendar, for the months that have one (oldest first).',
  })
  monthThemes!: MonthThemeDto[];

  @ApiProperty({ description: 'Number of sessions in the journal.' })
  sessionCount!: number;
}

export class ListSessionsQuery {
  @ApiProperty({ format: 'uuid', description: 'Journal to read.' })
  @IsUUID()
  journalId!: string;

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
  @ApiProperty({ format: 'uuid', description: 'Journal the session is added to.' })
  @IsUUID()
  journalId!: string;

  @ApiProperty({ enum: SESSION_TYPES, enumName: 'SessionType' })
  @IsIn(SESSION_TYPES)
  type!: SessionType;

  @ApiProperty({
    example: '2026-10-03',
    description: "Local date (YYYY-MM-DD), within the journal's period.",
  })
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

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 100,
    description: 'Title of an `OTHER` event, shown in the calendar.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;

  @ApiPropertyOptional({ enum: EVENT_COLORS, enumName: 'EventColor', nullable: true })
  @IsOptional()
  @IsIn(EVENT_COLORS)
  color?: EventColor | null;

  @ApiPropertyOptional({ enum: EVENT_ICONS, enumName: 'EventIcon', nullable: true })
  @IsOptional()
  @IsIn(EVENT_ICONS)
  icon?: EventIcon | null;
}

/** Calendar entry. */
export class SessionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  journalId!: string;

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

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Analyses, or the text of an `OTHER` event.',
  })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true, description: '`OTHER` events only.' })
  title!: string | null;

  @ApiProperty({
    enum: EVENT_COLORS,
    enumName: 'EventColor',
    nullable: true,
    description: '`OTHER` events only; null = default colour.',
  })
  color!: EventColor | null;

  @ApiProperty({
    enum: EVENT_ICONS,
    enumName: 'EventIcon',
    nullable: true,
    description: '`OTHER` events only; null = default pictogram.',
  })
  icon!: EventIcon | null;
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

/** `multipart/form-data` body of a photo upload. */
export class UploadPhotoDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'JPEG, PNG or WebP, 10 MB max.' })
  file!: unknown;
}

/** A photo attached to an event. Both URLs are signed and short-lived: reload the list to renew them. */
export class PhotoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uri',
    description: 'Resized image (2000 px on its longest side at most).',
  })
  url!: string;

  @ApiProperty({ format: 'uri', description: 'Thumbnail (400 px).' })
  thumbnailUrl!: string;

  @ApiProperty({ description: 'Width of the resized image, in pixels.' })
  width!: number;

  @ApiProperty({ description: 'Height of the resized image, in pixels.' })
  height!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
