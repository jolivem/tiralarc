import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CoachAccess, Discipline, SessionType } from '../../generated/prisma/client.js';
import { JournalDto } from '../../journal/dto/journal.dto.js';
import { COACH_ACCESSES } from '../../profile/dto/profile.dto.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DISCIPLINES = Object.values(Discipline);

/** The types a coach plans: the ones with a sheet, plus strength sessions. */
export const PLANNABLE_TYPES = [
  SessionType.TRAINING,
  SessionType.COACHING,
  SessionType.COMPETITION,
  SessionType.STRENGTH,
] as const;
export type PlannableType = (typeof PLANNABLE_TYPES)[number];

/** An archer who made the user their coach. */
export class AthleteDto {
  @ApiProperty({ format: 'uuid', description: "The archer's user id." })
  id!: string;

  @ApiProperty({ description: 'Display name, or email.' })
  name!: string;

  @ApiProperty({ enum: COACH_ACCESSES, enumName: 'CoachAccess' })
  access!: CoachAccess;

  @ApiProperty({
    type: () => JournalDto,
    nullable: true,
    description:
      "The archer's journal of the season in progress (its period covers today): the only one the " +
      'coach sees. Null when there is none.',
  })
  journal!: JournalDto | null;

  @ApiProperty({
    enum: DISCIPLINES,
    enumName: 'Discipline',
    isArray: true,
    description: 'The disciplines the archer practises (their profile), offered when planning.',
  })
  disciplines!: Discipline[];
}

/** The planning fields of a sheet: what a coach may fill in. */
class PlanningFields {
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @ApiPropertyOptional({ enum: DISCIPLINES, enumName: 'Discipline', nullable: true })
  @IsOptional()
  @IsIn(DISCIPLINES)
  discipline?: Discipline | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  distanceMeters?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  objective?: string | null;
}

export class PlanSessionDto extends PlanningFields {
  @ApiProperty({ enum: PLANNABLE_TYPES, enumName: 'PlannableType' })
  @IsIn(PLANNABLE_TYPES)
  type!: PlannableType;

  @ApiProperty({
    example: '2026-11-03',
    description: "A day after today, within the archer's journal of the season in progress.",
  })
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({
    example: '26349',
    description:
      "A `COMPETITION` added from the FFTA calendar (GET .../competitions): that competition's " +
      'id. At most 2 events of one competition per day (`LIMIT_REACHED`). Ignored for other types.',
  })
  @IsOptional()
  @Matches(/^\d{1,20}$/, { message: 'fftaCompetitionId must be a number' })
  fftaCompetitionId?: string;
}

/** PATCH body: every field optional; `null` clears a field. */
export class UpdatePlannedSessionDto extends PlanningFields {
  @ApiPropertyOptional({
    example: '2026-11-04',
    description: "A day after today, within the archer's journal of the season in progress.",
  })
  @IsOptional()
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
