import { applyDecorators } from '@nestjs/common';
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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** What an exercise's `amount` counts: repetitions, or seconds held (a plank). */
export const STRENGTH_MEASURES = ['REPS', 'SECONDS'] as const;
export type StrengthMeasure = (typeof STRENGTH_MEASURES)[number];
/** The load: body weight, a weight in kg (`loadKg`), or a resistance band. */
export const STRENGTH_LOADS = [
  'BODYWEIGHT',
  'KG',
  'BAND_LIGHT',
  'BAND_MEDIUM',
  'BAND_STRONG',
] as const;
export type StrengthLoad = (typeof STRENGTH_LOADS)[number];
export const MAX_STRENGTH_STEPS = 30;

/**
 * One exercise of a strength programme: on a STRENGTH sheet of the binder, or a STRENGTH event
 * of the journal (where it is ticked once done).
 */
export class StrengthStepDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'PLANK_FRONT',
    description:
      "The clients' catalogue exercise it was picked from (they name it in their language); null " +
      'for an exercise typed by the archer.',
  })
  @ValidateIf((_, value) => value !== null)
  @Matches(/^[A-Z][A-Z0-9_]{1,39}$/, { message: 'exercise must be a catalogue id' })
  exercise!: string | null;

  @ApiProperty({ example: 'Gainage face', maxLength: 120, description: 'As shown.' })
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  sets!: number;

  @ApiProperty({ enum: STRENGTH_MEASURES, enumName: 'StrengthMeasure' })
  @IsIn(STRENGTH_MEASURES)
  measure!: StrengthMeasure;

  @ApiProperty({ minimum: 1, maximum: 3600, description: 'Repetitions, or seconds, per set.' })
  @IsInt()
  @Min(1)
  @Max(3600)
  amount!: number;

  @ApiProperty({ enum: STRENGTH_LOADS, enumName: 'StrengthLoad' })
  @IsIn(STRENGTH_LOADS)
  load!: StrengthLoad;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0.5,
    maximum: 500,
    description: '`load` KG: the weight (kg); null otherwise.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(500)
  loadKg!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 900,
    description: 'Rest between two sets, in seconds; null = not said.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(900)
  restSeconds!: number | null;

  @ApiPropertyOptional({ maxLength: 300, default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @ApiPropertyOptional({
    description:
      'A STRENGTH event, from its day on: ticked once done. Absent = false; always present in ' +
      'responses (false on sheets).',
  })
  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

/** An optional strength programme in a request (replaces the stored one). */
export function StrengthStepsProperty(description: string): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      type: () => [StrengthStepDto],
      maxItems: MAX_STRENGTH_STEPS,
      description,
    }),
    IsOptional(),
    IsArray(),
    ArrayMaxSize(MAX_STRENGTH_STEPS),
    ValidateNested({ each: true }),
    Type(() => StrengthStepDto),
  );
}

/** A programme as stored: plain objects, texts trimmed, `loadKg` only with KG. */
export function cleanStrengthSteps(steps: StrengthStepDto[]) {
  return steps.map((step) => ({
    exercise: step.exercise,
    name: step.name.trim(),
    sets: step.sets,
    measure: step.measure,
    amount: step.amount,
    load: step.load,
    loadKg: step.load === 'KG' ? step.loadKg : null,
    restSeconds: step.restSeconds,
    note: (step.note ?? '').trim(),
    done: step.done === true,
  }));
}

/** The stored programme (a JSON array; null when none); `done` false when absent. */
export function asStrengthSteps(value: unknown): StrengthStepDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is StrengthStepDto =>
        typeof v === 'object' &&
        v !== null &&
        STRENGTH_MEASURES.includes((v as StrengthStepDto).measure),
    )
    .map((step) => ({ ...step, note: step.note ?? '', done: step.done === true }));
}
