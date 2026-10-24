import { ApiProperty } from '@nestjs/swagger';
import { Discipline } from '../../generated/prisma/client.js';

const DISCIPLINES = Object.values(Discipline);
/** Profile fields the rankings need. */
export const RANKING_FIELDS = ['licenceNumber', 'category', 'bowType'] as const;
export type RankingField = (typeof RANKING_FIELDS)[number];

/** The archer's place in one FFTA national ranking of their category and bow. */
export class RankingDto {
  @ApiProperty({
    example: '2027',
    description: 'The FFTA season it ranks: the current one, or the one before.',
  })
  season!: string;

  @ApiProperty({
    enum: DISCIPLINES,
    enumName: 'Discipline',
    description:
      "The archer's discipline it ranks: outdoor target archery is the archer's TAE discipline " +
      '(when they practise both, TAE_INTERNATIONAL for its distances: 70 m, or 50 m on an 80 cm face for a compound).',
  })
  discipline!: Discipline;

  @ApiProperty({ example: 'Senior 2 Femme Arc Classique 2027' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '70m - 122cm',
    description: 'Outdoor target archery: each distance has its ranking.',
  })
  distance!: string | null;

  @ApiProperty({ example: 12 })
  rank!: number;

  @ApiProperty({ example: 427, description: 'Archers in the ranking.' })
  total!: number;

  @ApiProperty({ type: Number, nullable: true, example: 536.5 })
  average!: number | null;

  @ApiProperty({
    type: Number,
    isArray: true,
    example: [545, 528],
    description: 'The best scores counted, best first as the FFTA lists them.',
  })
  scores!: number[];

  @ApiProperty({ format: 'uri', description: 'The ranking on the FFTA website.' })
  url!: string;
}

export class RankingListDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2027',
    description: 'The current FFTA season (null when not read).',
  })
  season!: string | null;

  @ApiProperty({
    enum: RANKING_FIELDS,
    enumName: 'RankingField',
    isArray: true,
    description: 'Profile fields to fill in first: licence number, category, bow.',
  })
  missing!: RankingField[];

  @ApiProperty({
    type: () => [RankingDto],
    description:
      "The rankings of the archer's category and bow, in their disciplines, that list their " +
      'licence (scratch rankings left out): the current season first, then the one before ' +
      '(also searched one category younger).',
  })
  rankings!: RankingDto[];

  @ApiProperty({
    description: 'False when the FFTA website could not be read in full: try again later.',
  })
  complete!: boolean;
}
