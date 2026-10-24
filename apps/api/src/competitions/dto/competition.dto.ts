import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { Discipline } from '../../generated/prisma/client.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DISCIPLINES = Object.values(Discipline);
export const COMPETITION_STATUSES = ['SCHEDULED', 'POSTPONED', 'CANCELLED'] as const;

/** A French department, for the archer profile's `department`. */
export class DepartmentDto {
  @ApiProperty({ example: '78', description: 'INSEE code: "01"…"95", "2A", "2B", "971"…' })
  code!: string;

  @ApiProperty({ example: 'Yvelines' })
  name!: string;
}

/** A competition of the FFTA calendar (https://www.ffta.fr/competitions). */
export class CompetitionDto {
  @ApiProperty({ example: '26349', description: "The FFTA's id of the competition." })
  id!: string;

  @ApiProperty({ example: 'TIR À 18M à VILLEPREUX' })
  title!: string;

  @ApiProperty({ example: '2026-10-31', description: 'First day (YYYY-MM-DD).' })
  startDate!: string;

  @ApiProperty({ example: '2026-11-01', description: 'Last day, inclusive (YYYY-MM-DD).' })
  endDate!: string;

  @ApiProperty({ type: String, nullable: true, example: 'VILLEPREUX' })
  city!: string | null;

  @ApiProperty({ type: String, nullable: true, example: "CIE D'ARC DE VILLEPREUX" })
  organizer!: string | null;

  @ApiProperty({
    enum: DISCIPLINES,
    enumName: 'Discipline',
    description:
      "The archer's discipline it belongs to: outdoor target archery is TAE_NATIONAL unless the " +
      'archer practises only TAE_INTERNATIONAL.',
  })
  discipline!: Discipline;

  @ApiProperty({ description: 'A para-archery competition.' })
  para!: boolean;

  @ApiProperty({ description: 'Teams only: no individual ranking.' })
  teamOnly!: boolean;

  @ApiProperty({ enum: COMPETITION_STATUSES, enumName: 'CompetitionStatus' })
  status!: (typeof COMPETITION_STATUSES)[number];

  @ApiProperty({ format: 'uri', description: 'Its page on the FFTA website.' })
  url!: string;

  @ApiProperty({
    description:
      'The archer said they will not take part (PUT .../dismissal): left out of the ' +
      'competitions to plan; the calendars still show it.',
  })
  dismissed!: boolean;

  @ApiProperty({
    type: String,
    format: 'uri',
    nullable: true,
    description: 'The organiser\'s invitation ("mandat", PDF), once published.',
  })
  mandateUrl!: string | null;
}

export class CompetitionListDto {
  @ApiProperty({
    type: () => DepartmentDto,
    nullable: true,
    description: "The archer's department (profile); null = none chosen, hence no competitions.",
  })
  department!: DepartmentDto | null;

  @ApiProperty({
    type: () => [CompetitionDto],
    description:
      "The department's competitions in the archer's disciplines (profile) that have not ended " +
      'yet and touch the requested days, by first day.',
  })
  competitions!: CompetitionDto[];

  @ApiProperty({
    description:
      'False when the FFTA website could not be read for some of the disciplines: the list may ' +
      'miss competitions (try again later).',
  })
  complete!: boolean;
}

export class CompetitionResultsDto {
  @ApiProperty({
    type: String,
    format: 'uri',
    nullable: true,
    example: 'https://extranet.ffta.fr/pdfresultats/2026/T_0878139_20260607_76816.pdf',
    description:
      'The results published by the organiser on the FFTA website (PDF); null until they are ' +
      '(or when the FFTA website could not be read).',
  })
  url!: string | null;
}

export class ListCompetitionsQuery {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'First day, inclusive (YYYY-MM-DD). Omitted = today.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    example: '2027-08-31',
    description:
      'Last day, inclusive (YYYY-MM-DD). Omitted = a year from today, which is also as far as ' +
      'the calendar is read.',
  })
  @IsOptional()
  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
