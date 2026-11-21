import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Discipline, GoalMetric, GoalType } from '../../generated/prisma/client.js';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const GOAL_TYPES = Object.values(GoalType);
const GOAL_METRICS = Object.values(GoalMetric);
const DISCIPLINES = Object.values(Discipline);
const METRIC_DESCRIPTION =
  'What a figured goal measures, followed from the events since `createdOn` (it is then ' +
  'reached by itself, the day the target is met): SCORE = the best score in competition (a ' +
  "round of fixed length, unlike a training's); ARROWS = the arrows shot in all. Null: a goal " +
  'in words only. ' +
  'Given with `target` (VALIDATION_FAILED otherwise).';
export const MAX_TARGET = 1_000_000;

export class CreateGoalDto {
  @ApiProperty({ enum: GOAL_TYPES, enumName: 'GoalType' })
  @IsIn(GOAL_TYPES)
  type!: GoalType;

  @ApiProperty({ example: 'Passer les 550 points en salle', minLength: 1, maxLength: 500 })
  @IsString()
  @Matches(/\S/, { message: 'description must not be blank' })
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({
    example: '2026-10-10',
    description: 'Day the goal was set (YYYY-MM-DD). Defaults to today.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'createdOn must be YYYY-MM-DD' })
  createdOn?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2027-02-06',
    description: 'Day the goal was reached (YYYY-MM-DD); omitted / null = not reached yet.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'achievedOn must be YYYY-MM-DD' })
  achievedOn?: string | null;

  @ApiPropertyOptional({
    enum: GOAL_METRICS,
    enumName: 'GoalMetric',
    nullable: true,
    description: METRIC_DESCRIPTION,
  })
  @IsOptional()
  @IsIn(GOAL_METRICS)
  metric?: GoalMetric | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: MAX_TARGET,
    example: 550,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TARGET)
  target?: number | null;

  @ApiPropertyOptional({
    enum: DISCIPLINES,
    enumName: 'Discipline',
    nullable: true,
    description: 'SCORE goals: only the competitions of this discipline (null: any).',
  })
  @IsOptional()
  @IsIn(DISCIPLINES)
  discipline?: Discipline | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 18,
    description: 'SCORE goals: only the competitions shot at this distance, in metres (null: any).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  distanceMeters?: number | null;
}

/** PATCH body: every field optional; `achievedOn: null` marks the goal as not reached. */
export class UpdateGoalDto {
  @ApiPropertyOptional({ enum: GOAL_TYPES, enumName: 'GoalType' })
  @IsOptional()
  @IsIn(GOAL_TYPES)
  type?: GoalType;

  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'description must not be blank' })
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-10' })
  @IsOptional()
  @Matches(DATE, { message: 'createdOn must be YYYY-MM-DD' })
  createdOn?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2027-02-06' })
  @IsOptional()
  @Matches(DATE, { message: 'achievedOn must be YYYY-MM-DD' })
  achievedOn?: string | null;

  @ApiPropertyOptional({
    enum: GOAL_METRICS,
    enumName: 'GoalMetric',
    nullable: true,
    description: `${METRIC_DESCRIPTION} Null makes it a goal in words only.`,
  })
  @IsOptional()
  @IsIn(GOAL_METRICS)
  metric?: GoalMetric | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: MAX_TARGET })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TARGET)
  target?: number | null;

  @ApiPropertyOptional({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  @IsOptional()
  @IsIn(DISCIPLINES)
  discipline?: Discipline | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  distanceMeters?: number | null;
}

/** One of the archer's goals. */
export class GoalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: GOAL_TYPES, enumName: 'GoalType' })
  type!: GoalType;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: '2026-10-10', description: 'Day the goal was set.' })
  createdOn!: string;

  @ApiProperty({ description: 'True once the goal has a day it was reached.' })
  achieved!: boolean;

  @ApiProperty({ type: String, nullable: true, example: '2027-02-06' })
  achievedOn!: string | null;

  @ApiProperty({
    enum: GOAL_METRICS,
    enumName: 'GoalMetric',
    nullable: true,
    description: METRIC_DESCRIPTION,
  })
  metric!: GoalMetric | null;

  @ApiProperty({ type: Number, nullable: true, example: 550 })
  target!: number | null;

  @ApiProperty({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  discipline!: Discipline | null;

  @ApiProperty({ type: Number, nullable: true, example: 18 })
  distanceMeters!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 532,
    description:
      'Figured goals: the best score so far, or the arrows shot so far (up to today); null otherwise.',
  })
  progress!: number | null;
}
