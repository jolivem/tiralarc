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
import { AgeCategory, BowType, Discipline } from '../../generated/prisma/client.js';

const CATEGORIES = Object.values(AgeCategory);
const BOW_TYPES = Object.values(BowType);
const DISCIPLINES = Object.values(Discipline);
export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

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
    description: "True when the guest is the archer's coach.",
  })
  @IsOptional()
  @IsBoolean()
  isCoach?: boolean;
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

  @ApiProperty({ enum: INVITATION_STATUSES, enumName: 'InvitationStatus' })
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
