import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SUPPORTED_LOCALES } from '../../common/locales.js';
import { Role } from '../../generated/prisma/client.js';

/** Roles a user may give themselves. ADMIN is granted by an administrator only. */
export const SELF_ASSIGNABLE_ROLES = [Role.ARCHER, Role.COACH] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

const deviceNameProperty = {
  description:
    'Human-readable device label (e.g. "Pixel 9", "Firefox on Linux"), shown in session lists.',
  maxLength: 100,
};

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional(deviceNameProperty)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class RegisterDto {
  @ApiProperty({ format: 'email', example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({
    enum: SELF_ASSIGNABLE_ROLES,
    enumName: 'SelfAssignableRole',
    isArray: true,
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @ArrayMaxSize(SELF_ASSIGNABLE_ROLES.length)
  @IsIn(SELF_ASSIGNABLE_ROLES, { each: true })
  roles!: SelfAssignableRole[];

  @ApiPropertyOptional({
    enum: SUPPORTED_LOCALES,
    description: 'Language of the emails sent to the user.',
  })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

export class RegistrationDto {
  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({
    description: 'Always true: a confirmation link was emailed; login is refused until it is used.',
  })
  verificationRequired!: boolean;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the link emailed at registration.' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiPropertyOptional(deviceNameProperty)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class ResendVerificationDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class SocialSignInDto {
  @ApiProperty({
    description:
      'ID token returned by Google Identity Services / Sign in with Apple (web or native SDK).',
  })
  @IsString()
  @MinLength(1)
  idToken!: string;

  @ApiPropertyOptional({
    description: 'Nonce passed to the provider when requesting the token; checked if present.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nonce?: string;

  @ApiPropertyOptional({
    enum: SELF_ASSIGNABLE_ROLES,
    enumName: 'SelfAssignableRole',
    isArray: true,
    description:
      'Roles for a new account. If omitted for a new account, it is created without roles and ' +
      'the client must ask the user (PUT /users/me/roles). Ignored for existing accounts.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(SELF_ASSIGNABLE_ROLES.length)
  @IsIn(SELF_ASSIGNABLE_ROLES, { each: true })
  roles?: SelfAssignableRole[];

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Apple only sends the name to the client, on first sign-in: forward it here.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;

  @ApiPropertyOptional(deviceNameProperty)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT, sent as `Authorization: Bearer <token>`.' })
  accessToken!: string;

  @ApiProperty({
    description: 'Opaque, single-use token exchanged at /auth/refresh for a new pair.',
  })
  refreshToken!: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Access token lifetime, in seconds.' })
  expiresIn!: number;

  @ApiProperty({ description: 'Refresh token lifetime, in seconds.' })
  refreshExpiresIn!: number;
}
