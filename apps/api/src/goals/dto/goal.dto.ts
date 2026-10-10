import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { GoalType } from '../../generated/prisma/client.js';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const GOAL_TYPES = Object.values(GoalType);

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
}
