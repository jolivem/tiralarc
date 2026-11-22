import { Module } from '@nestjs/common';
import { SheetPhotosController } from './sheet-photos.controller.js';
import { SheetPhotosService } from './sheet-photos.service.js';
import { SheetTemplatesController } from './sheet-templates.controller.js';
import { SheetTemplatesService } from './sheet-templates.service.js';
import { SheetsController } from './sheets.controller.js';
import { SheetsService } from './sheets.service.js';

@Module({
  controllers: [SheetsController, SheetPhotosController, SheetTemplatesController],
  providers: [SheetsService, SheetPhotosService, SheetTemplatesService],
  exports: [SheetsService, SheetPhotosService],
})
export class SheetsModule {}
