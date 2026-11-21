import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Confirms the deletion of the signed-in account: its email typed again, and its password when
 * it has one (`hasPassword` on `/users/me`; accounts created with Google / Apple only have none).
 */
export class DeleteAccountDto {
  @ApiProperty({ format: 'email', description: "The account's email, typed again." })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    maxLength: 128,
    description: 'Required when the account has a password (INVALID_CREDENTIALS if wrong).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}
