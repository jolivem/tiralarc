import { Module } from '@nestjs/common';
import { IanseoClient } from './ianseo.client.js';
import { IanseoWatch } from './ianseo-watch.service.js';
import { ScoreSheetFinder } from './score-sheet-finder.js';
import { ScoreSheetsService } from './score-sheets.service.js';

@Module({
  // IanseoWatch: an alert email when the site's pages change layout (ianseo-layout.ts).
  providers: [IanseoClient, IanseoWatch, ScoreSheetFinder, ScoreSheetsService],
})
export class ScoreSheetsModule {}
