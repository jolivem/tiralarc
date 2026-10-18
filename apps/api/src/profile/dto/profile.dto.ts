import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { SUPPORTED_LOCALES } from '../../common/locales.js';
import {
  AgeCategory,
  BowType,
  CoachAccess,
  Discipline,
  Indicator,
} from '../../generated/prisma/client.js';

const CATEGORIES = Object.values(AgeCategory);
export const COACH_ACCESSES = Object.values(CoachAccess);
const COACH_ACCESS_DESCRIPTION =
  "What the coach may do in the archer's journal of the season in progress (the one whose " +
  'period covers today): READ = see all of it, plus the indicators and goals; WRITE = READ, and ' +
  'plan future trainings, coachings, competitions and strength sessions.';
const BOW_TYPES = Object.values(BowType);
const DISCIPLINES = Object.values(Discipline);
const INDICATORS = Object.values(Indicator);
export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];
/** Font ids are client-side catalogue keys, like decoration themes. */
const FONT = /^[a-z0-9-]{1,30}$/;

/** An archer's sport details. */
export class ProfileDto {
  @ApiProperty({ type: String, nullable: true, example: '0123456A' })
  licenceNumber!: string | null;

  @ApiProperty({ enum: CATEGORIES, enumName: 'AgeCategory', nullable: true })
  category!: AgeCategory | null;

  @ApiProperty({ enum: BOW_TYPES, enumName: 'BowType', nullable: true })
  bowType!: BowType | null;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline', isArray: true })
  disciplines!: Discipline[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'dancing-script',
    description:
      "Font of the calendars' weekdays and day numbers: an id each client maps to its own font; null = the client's default.",
  })
  calendarFont!: string | null;

  @ApiProperty({
    enum: INDICATORS,
    enumName: 'Indicator',
    nullable: true,
    description: 'The indicator shown on the home page; null = none.',
  })
  favoriteIndicator!: Indicator | null;
}

/** PATCH body: every field optional; `null` clears a field. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  licenceNumber?: string | null;

  @ApiPropertyOptional({ enum: CATEGORIES, enumName: 'AgeCategory', nullable: true })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: AgeCategory | null;

  @ApiPropertyOptional({ enum: BOW_TYPES, enumName: 'BowType', nullable: true })
  @IsOptional()
  @IsIn(BOW_TYPES)
  bowType?: BowType | null;

  @ApiPropertyOptional({
    enum: DISCIPLINES,
    enumName: 'Discipline',
    isArray: true,
    description: 'Replaces the practised disciplines.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(DISCIPLINES, { each: true })
  disciplines?: Discipline[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'dancing-script',
    pattern: '^[a-z0-9-]{1,30}$',
    description: "Font id of the calendars; null goes back to the client's default.",
  })
  @IsOptional()
  @Matches(FONT, { message: 'calendarFont must be a lowercase slug' })
  calendarFont?: string | null;

  @ApiPropertyOptional({
    enum: INDICATORS,
    enumName: 'Indicator',
    nullable: true,
    description: 'The indicator shown on the home page; null for none.',
  })
  @IsOptional()
  @IsIn(INDICATORS)
  favoriteIndicator?: Indicator | null;
}

export class CreateInvitationDto {
  @ApiProperty({ example: 'Camille Martin', minLength: 1, maxLength: 100 })
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ format: 'email', description: 'Where the invitation is sent.' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    default: false,
    description:
      "True when the guest is the archer's coach: accepting (signed in) gives them `coachAccess`. " +
      'Otherwise the guest is only invited to discover the site.',
  })
  @IsOptional()
  @IsBoolean()
  isCoach?: boolean;

  @ApiPropertyOptional({
    enum: COACH_ACCESSES,
    enumName: 'CoachAccess',
    default: CoachAccess.READ,
    description: `${COACH_ACCESS_DESCRIPTION} Ignored unless \`isCoach\`.`,
  })
  @IsOptional()
  @IsIn(COACH_ACCESSES)
  coachAccess?: CoachAccess;

  @ApiPropertyOptional({
    enum: SUPPORTED_LOCALES,
    description: "Language of the invitation email; the archer's own language when omitted.",
  })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

/** PATCH body of a coach's invitation. */
export class UpdateInvitationDto {
  @ApiProperty({
    enum: COACH_ACCESSES,
    enumName: 'CoachAccess',
    description: COACH_ACCESS_DESCRIPTION,
  })
  @IsIn(COACH_ACCESSES)
  coachAccess!: CoachAccess;
}

/** Someone the archer invited. */
export class InvitationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  isCoach!: boolean;

  @ApiProperty({
    enum: COACH_ACCESSES,
    enumName: 'CoachAccess',
    nullable: true,
    description: `Coaches only. ${COACH_ACCESS_DESCRIPTION}`,
  })
  coachAccess!: CoachAccess | null;

  @ApiProperty({
    enum: INVITATION_STATUSES,
    enumName: 'InvitationStatus',
    description: 'A coach has ACCEPTED once linked to an account (and then has access).',
  })
  status!: InvitationStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Token from the invitation link.' })
  @IsString()
  @MaxLength(200)
  token!: string;
}

export class AcceptedInvitationDto {
  @ApiProperty({ description: 'Display name (or email) of the archer who sent the invitation.' })
  invitedBy!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      "Coach invitations: the archer's id (see /coach/athletes/{archerId}); null for a plain guest.",
  })
  archerId!: string | null;
}

export class CreateSiteDto {
  @ApiProperty({ example: 'FFTA', minLength: 1, maxLength: 100 })
  @IsString()
  @Matches(/\S/, { message: 'label must not be blank' })
  @MaxLength(100)
  label!: string;

  @ApiProperty({ example: 'https://www.ffta.fr', description: 'http(s) URL.', maxLength: 500 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;
}

/** A favourite website. */
export class SiteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;
}
