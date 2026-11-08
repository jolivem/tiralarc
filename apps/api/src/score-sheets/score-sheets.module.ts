import { Module } from '@nestjs/common';
import { IanseoClient } from './ianseo.client.js';
import { ScoreSheetFinder } from './score-sheet-finder.js';
import { ScoreSheetsService } from './score-sheets.service.js';

@Module({
  providers: [IanseoClient, ScoreSheetFinder, ScoreSheetsService],
})
export class ScoreSheetsModule {}
