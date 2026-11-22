import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SheetCategory } from '../../generated/prisma/client.js';
import { MAX_BODY, MAX_TITLE, SHEET_CATEGORIES } from './sheet.dto.js';

/** A template as the admins see and write it: both languages, hidden or not. */
export class AdminSheetTemplateDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  category!: SheetCategory;

  @ApiProperty({ description: 'Order in its category (1 first).' })
  position!: number;

  @ApiProperty({ description: 'Not offered to the archers.' })
  hidden!: boolean;

  @ApiProperty({ example: 'Ma corde' })
  titleFr!: string;

  @ApiProperty()
  bodyFr!: string;

  @ApiProperty({ example: 'My string' })
  titleEn!: string;

  @ApiProperty()
  bodyEn!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

/** A template's title: not blank, at most MAX_TITLE characters. */
const Title = () =>
  applyDecorators(
    IsString(),
    Matches(/\S/, { message: 'title must not be blank' }),
    MaxLength(MAX_TITLE),
  );

/** POST body: a template in both languages (the text may be empty). */
export class CreateSheetTemplateDto {
  @ApiProperty({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  @IsIn(SHEET_CATEGORIES)
  category!: SheetCategory;

  @ApiProperty({ minLength: 1, maxLength: MAX_TITLE })
  @Title()
  titleFr!: string;

  @ApiProperty({ maxLength: MAX_BODY })
  @IsString()
  @MaxLength(MAX_BODY)
  bodyFr!: string;

  @ApiProperty({ minLength: 1, maxLength: MAX_TITLE })
  @Title()
  titleEn!: string;

  @ApiProperty({ maxLength: MAX_BODY })
  @IsString()
  @MaxLength(MAX_BODY)
  bodyEn!: string;

  @ApiPropertyOptional({ description: 'Not offered to the archers yet (false by default).' })
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

/** PATCH body: any field; a new category puts the template at its end. */
export class UpdateSheetTemplateDto {
  @ApiPropertyOptional({ enum: SHEET_CATEGORIES, enumName: 'SheetCategory' })
  @IsOptional()
  @IsIn(SHEET_CATEGORIES)
  category?: SheetCategory;

  @ApiPropertyOptional({ minLength: 1, maxLength: MAX_TITLE })
  @IsOptional()
  @Title()
  titleFr?: string;

  @ApiPropertyOptional({ maxLength: MAX_BODY })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY)
  bodyFr?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: MAX_TITLE })
  @IsOptional()
  @Title()
  titleEn?: string;

  @ApiPropertyOptional({ maxLength: MAX_BODY })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY)
  bodyEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export const MOVE_DIRECTIONS = ['UP', 'DOWN'] as const;

/** POST body of `.../move`: one place up or down in its category. */
export class MoveSheetTemplateDto {
  @ApiProperty({ enum: MOVE_DIRECTIONS, enumName: 'MoveDirection' })
  @IsIn(MOVE_DIRECTIONS)
  direction!: (typeof MOVE_DIRECTIONS)[number];
}
