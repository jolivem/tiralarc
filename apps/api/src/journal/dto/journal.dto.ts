import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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

/** Event types an archer can define. */
export const MAX_CUSTOM_TYPES = 4;

/** An event type the archer defined: how its events show in the calendars. */
export class CustomEventTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Kiné' })
  title!: string;

  @ApiProperty({
    enum: EVENT_COLORS,
    enumName: 'EventColor',
    description: 'Colour of its events in the calendars (the season overview draws them in it).',
  })
  color!: EventColor;

  @ApiProperty({
    enum: EVENT_ICONS,
    enumName: 'EventIcon',
    description: 'Pictogram of its events in the month calendar.',
  })
  icon!: EventIcon;
}

export class CreateCustomEventTypeDto {
  @ApiProperty({ example: 'Kiné', minLength: 1, maxLength: 40 })
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(40)
  title!: string;

  @ApiProperty({ enum: EVENT_COLORS, enumName: 'EventColor' })
  @IsIn(EVENT_COLORS)
  color!: EventColor;

  @ApiProperty({ enum: EVENT_ICONS, enumName: 'EventIcon' })
  @IsIn(EVENT_ICONS)
  icon!: EventIcon;
}

/** PATCH body: every field optional. Its events follow the change. */
export class UpdateCustomEventTypeDto {
  @ApiPropertyOptional({ example: 'Kiné', minLength: 1, maxLength: 40 })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(40)
  title?: string;

  @ApiPropertyOptional({ enum: EVENT_COLORS, enumName: 'EventColor' })
  @IsOptional()
  @IsIn(EVENT_COLORS)
  color?: EventColor;

  @ApiPropertyOptional({ enum: EVENT_ICONS, enumName: 'EventIcon' })
  @IsOptional()
  @IsIn(EVENT_ICONS)
  icon?: EventIcon;
}

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
    description:
      "Last day, inclusive (YYYY-MM-DD). Not before `startDate`; the period must not overlap another of the archer's journals.",
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
    description:
      "Last day, inclusive. The period must not overlap another of the archer's journals.",
  })
  @IsOptional()
  @Matches(DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({
    description:
      "true makes it the archer's default journal (the one opened at sign-in) in place of any other; false leaves no default.",
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * Colourable areas: the theme's artwork bands, and `title`, the month's name drawn in
 * hollow letters by the client (it doesn't depend on the theme's artwork).
 */
export const THEME_BANDS = ['top', 'bottom', 'left', 'right', 'title'] as const;
export type ThemeBand = (typeof THEME_BANDS)[number];
/** The band whose colouring outlives a change of theme. */
export const TITLE_BAND: ThemeBand = 'title';
/** Colouring one decoration takes far fewer; this only bounds the stored size. */
export const MAX_FILLS = 500;

/** One "paint bucket" click on a theme's artwork: the closed area around the point takes the colour. */
export class FillDto {
  @ApiProperty({
    enum: THEME_BANDS,
    enumName: 'ThemeBand',
    description:
      "Which band was clicked: one of the theme's artwork bands, or `title` (the month's name in hollow letters, drawn by the client).",
  })
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
    type: String,
    nullable: true,
    example: 'archery',
    description:
      "Theme id; each client maps it to its own artwork. Null: no decoration, only the month's name is coloured.",
  })
  theme!: string | null;

  @ApiProperty({
    type: () => [FillDto],
    description:
      "The archer's colouring of that month (decoration bands and name), in the order it was painted.",
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
      "Theme id, or null to remove the decoration of that month. Changing or removing it clears the artwork bands' colouring; the `title` band (the month's name) keeps its own.",
  })
  @ValidateIf((_, value) => value !== null)
  @Matches(THEME, { message: 'theme must be a lowercase slug' })
  theme!: string | null;
}

/** Stars a month can be given: 0.5 to 5, by halves. */
export const MONTH_SATISFACTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export class MonthSatisfactionDto {
  @ApiProperty({ example: '2026-10', description: 'Month (YYYY-MM).' })
  month!: string;

  @ApiProperty({
    enum: MONTH_SATISFACTIONS,
    example: 3.5,
    description:
      "The archer's overall satisfaction with the month, in stars (0.5 to 5, by halves).",
  })
  stars!: number;
}

export class SetMonthSatisfactionDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    enum: MONTH_SATISFACTIONS,
    example: 3.5,
    description: 'Stars (0.5 to 5, by halves), or null: the month is not rated.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsIn(MONTH_SATISFACTIONS, { message: 'stars must be 0.5 to 5, by halves' })
  stars!: number | null;
}

/** A season's journal: a named period. Its events are the archer's sessions dated within it. */
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

  @ApiProperty({
    type: () => [MonthSatisfactionDto],
    description: 'Satisfaction of the months the archer rated (oldest first).',
  })
  monthSatisfactions!: MonthSatisfactionDto[];

  @ApiProperty({ description: "Number of the archer's events dated within the period." })
  sessionCount!: number;

  @ApiProperty({
    description: "The journal to open at sign-in. At most one of the archer's journals has it.",
  })
  isDefault!: boolean;
}

/** One competition of a journal, as listed in the archer's indicators. */
export class CompetitionStatDto {
  @ApiProperty({ format: 'uuid', description: 'Id of the event (session).' })
  id!: string;

  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  discipline!: Discipline | null;

  @ApiProperty({ type: Number, nullable: true })
  arrowCount!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  score!: number | null;

  @ApiProperty({ type: String, nullable: true })
  location!: string | null;
}

/** A training, coaching or competition with a score and a discipline, for the score charts. */
export class ScoreStatDto {
  @ApiProperty({ format: 'uuid', description: 'Id of the event (session).' })
  id!: string;

  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({
    enum: SESSION_TYPES,
    enumName: 'SessionType',
    description: 'TRAINING, COACHING or COMPETITION.',
  })
  type!: SessionType;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline' })
  discipline!: Discipline;

  @ApiProperty()
  score!: number;
}

export class EventsByDayDto {
  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ enum: SESSION_TYPES, enumName: 'SessionType' })
  type!: SessionType;

  @ApiProperty({ description: 'Events of that type on that day.' })
  count!: number;
}

export class FeelingsByDayDto {
  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ enum: FEELINGS, enumName: 'Feeling' })
  feeling!: Feeling;

  @ApiProperty({ description: 'Events of that day with that feeling.' })
  count!: number;
}

export class ArrowsByDayDto {
  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ description: 'Arrows shot that day, all types of events together.' })
  arrows!: number;
}

export class DurationsByDayDto {
  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ description: 'Minutes spent that day, all types of events together.' })
  minutes!: number;
}

/** What the indicators are drawn from. Running totals and per-discipline series are left to clients. */
export class JournalStatsDto {
  @ApiProperty({ type: () => [CompetitionStatDto], description: 'Competitions, oldest first.' })
  competitions!: CompetitionStatDto[];

  @ApiProperty({
    type: () => [ScoreStatDto],
    description:
      'Trainings, coachings and competitions with both a score and a discipline, oldest first.',
  })
  scores!: ScoreStatDto[];

  @ApiProperty({
    type: () => [EventsByDayDto],
    description: 'Number of events per day and type (days with events only), oldest first.',
  })
  eventsByDay!: EventsByDayDto[];

  @ApiProperty({
    type: () => [FeelingsByDayDto],
    description:
      'Physical feeling of the events, counted per day (events with one only), oldest first.',
  })
  physicalFeelingsByDay!: FeelingsByDayDto[];

  @ApiProperty({
    type: () => [FeelingsByDayDto],
    description:
      'Mental feeling of the events, counted per day (events with one only), oldest first.',
  })
  mentalFeelingsByDay!: FeelingsByDayDto[];

  @ApiProperty({
    type: () => [ArrowsByDayDto],
    description: 'Days with a recorded number of arrows, oldest first.',
  })
  arrowsByDay!: ArrowsByDayDto[];

  @ApiProperty({
    type: () => [DurationsByDayDto],
    description: 'Days with a recorded duration, oldest first.',
  })
  durationsByDay!: DurationsByDayDto[];
}

export class StatsQuery {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'First day, inclusive (YYYY-MM-DD). Omitted = from the first event.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    example: '2027-08-31',
    description: 'Last day, inclusive (YYYY-MM-DD). Omitted = up to the last event.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

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

  @ApiProperty({
    example: '2026-10-03',
    description: 'Local date (YYYY-MM-DD).',
  })
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      "Required for a `CUSTOM` event (one of the archer's event types), ignored otherwise.",
  })
  @IsOptional()
  @IsUUID()
  customTypeId?: string;
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

  @ApiProperty({ enum: SESSION_TYPES, enumName: 'SessionType' })
  type!: SessionType;

  @ApiProperty({ example: '2026-10-03' })
  date!: string;

  @ApiProperty({ type: Number, nullable: true })
  durationMinutes!: number | null;

  @ApiProperty({ type: String, nullable: true })
  location!: string | null;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  discipline!: Discipline | null;

  @ApiProperty({ type: Number, nullable: true })
  score!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Arrows shot (clients add them up, e.g. for the month shown).',
  })
  arrowCount!: number | null;

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

  @ApiProperty({
    type: () => CustomEventTypeDto,
    nullable: true,
    description: '`CUSTOM` events only: their type, whose title, colour and pictogram they show.',
  })
  customType!: CustomEventTypeDto | null;

  @ApiProperty({
    description:
      'Whether the review of a training, coaching or competition is written: at least one of ' +
      'arrowCount, score, satisfaction, technique, description, physicalFeeling, mentalFeeling, ' +
      'wentWell, toImprove, nextTime is filled. Always true for the other types (nothing to ' +
      'review). Clients fill the review only once the day has come.',
  })
  completed!: boolean;

  @ApiProperty({
    description:
      "Whether the archer's coach planned the event (see `SessionDto.plannedBy`). Clients mark " +
      'it until the archer completes it.',
  })
  plannedByCoach!: boolean;
}

/** The coach who planned an event. */
export class PlannerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Display name, or email.' })
  name!: string;
}

/** An event the archer's coach planned that the archer hasn't opened yet. */
export class NewEventDto extends SessionSummaryDto {
  @ApiProperty({ type: () => PlannerDto })
  plannedBy!: PlannerDto;
}

/** Full session sheet. */
export class SessionDto extends SessionSummaryDto {
  @ApiProperty({
    type: () => PlannerDto,
    nullable: true,
    description:
      "The coach who planned the event in the archer's journal; null when the archer created it. " +
      'That coach may change its planning or delete it while it is still to come.',
  })
  plannedBy!: PlannerDto | null;

  @ApiProperty({ type: Number, nullable: true })
  distanceMeters!: number | null;

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
