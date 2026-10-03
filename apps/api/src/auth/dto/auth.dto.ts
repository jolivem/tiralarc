import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    description:
      'Human-readable device label (e.g. "Pixel 9", "Firefox on Linux"), shown in session lists.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class RegisterDto extends LoginDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
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
