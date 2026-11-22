import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { SheetCategory } from '../../generated/prisma/client.js';
import { StrengthStepDto, StrengthStepsProperty } from '../../journal/dto/strength.dto.js';

export const SHEET_CATEGORIES = Object.values(SheetCategory);
export const MAX_TITLE = 120;
export const MAX_BODY = 20_000;
const LOCALE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

/** A sheet as listed in its category's index: no text. */
export class SheetSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  category!: SheetCategory;

  @ApiProperty({ example: 'Ancrage', maxLength: MAX_TITLE })
  title!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', description: 'Last change of its title or text.' })
  updatedAt!: Date;
}

export class SheetDto extends SheetSummaryDto {
  @ApiProperty({ description: 'Free text; line breaks kept.', maxLength: MAX_BODY })
  body!: string;

  @ApiProperty({
    type: () => [StrengthStepDto],
    description: 'STRENGTH sheets: the programme built with the guide, in order (else empty).',
  })
  strengthSteps!: StrengthStepDto[];
}

/** A ready-made sheet offered when adding one: its title and text start the new sheet. */
export class SheetTemplateDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  category!: SheetCategory;

  @ApiProperty({ example: 'Ma corde' })
  title!: string;

  @ApiProperty({ description: 'Lines to fill in.' })
  body!: string;
}

export class SheetTemplatesQuery {
  @ApiPropertyOptional({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  @IsOptional()
  @IsIn(SHEET_CATEGORIES)
  category?: SheetCategory;

  @ApiPropertyOptional({
    example: 'fr',
    description: "Their language: English for 'en', else French; by default the account's.",
  })
  @IsOptional()
  @Matches(LOCALE, { message: 'locale must be a language code' })
  locale?: string;
}

export class CreateSheetDto {
  @ApiProperty({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  @IsIn(SHEET_CATEGORIES)
  category!: SheetCategory;

  @ApiProperty({ example: 'Ancrage', minLength: 1, maxLength: MAX_TITLE })
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(MAX_TITLE)
  title!: string;

  @ApiPropertyOptional({
    maxLength: MAX_BODY,
    description: "The text; when left out, the template's (if any), else empty.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY)
  body?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'A template of the same category (GET /sheets/templates), not hidden: its text starts the sheet.',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    example: 'fr',
    description: 'With `templateId`: the language of its text, as for GET /sheets/templates.',
  })
  @IsOptional()
  @Matches(LOCALE, { message: 'locale must be a language code' })
  locale?: string;
}

/** PATCH body: the title, the text and / or a STRENGTH sheet's programme (the category stays). */
export class UpdateSheetDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: MAX_TITLE })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'title must not be blank' })
  @MaxLength(MAX_TITLE)
  title?: string;

  @ApiPropertyOptional({ maxLength: MAX_BODY })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY)
  body?: string;

  @StrengthStepsProperty(
    'STRENGTH sheets only (another category: 400): the programme, in order (replaces it).',
  )
  strengthSteps?: StrengthStepDto[];
}
