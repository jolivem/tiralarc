import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type ArcherSheet, SheetCategory } from '../generated/prisma/client.js';
import { asStrengthSteps, cleanStrengthSteps } from '../journal/dto/strength.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSheetDto, SheetDto, SheetSummaryDto, UpdateSheetDto } from './dto/sheet.dto.js';
import { SheetPhotosService } from './sheet-photos.service.js';
import { SheetTemplatesService } from './sheet-templates.service.js';

/** At most this many sheets in each of the binder's four categories. */
export const MAX_SHEETS_PER_CATEGORY = 100;

const SUMMARY = {
  id: true,
  category: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** The archer's binder (Sheets section): sheets in four categories, a title and a free text. */
@Injectable()
export class SheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: SheetTemplatesService,
    private readonly photos: SheetPhotosService,
  ) {}

  /** Every sheet, without its text: by category, then title. */
  async list(userId: string): Promise<SheetSummaryDto[]> {
    const sheets = await this.prisma.archerSheet.findMany({ where: { userId }, select: SUMMARY });
    return sheets.sort((a, b) => a.title.localeCompare(b.title, 'fr', { numeric: true }));
  }

  /** Every sheet with its text, oldest first (the PDF extract, the account's export). */
  async all(userId: string): Promise<SheetDto[]> {
    return (
      await this.prisma.archerSheet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    ).map(toDto);
  }

  async get(userId: string, id: string): Promise<SheetDto> {
    return toDto(await this.findOwned(userId, id));
  }

  async create(userId: string, dto: CreateSheetDto): Promise<SheetDto> {
    const count = await this.prisma.archerSheet.count({
      where: { userId, category: dto.category },
    });
    if (count >= MAX_SHEETS_PER_CATEGORY) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_SHEETS_PER_CATEGORY} sheets per category`,
      );
    }
    // Started from a template: its text in the language asked for (a hidden one is not found).
    const templateText = dto.templateId
      ? await this.templates.text(userId, dto.templateId, dto.category, dto.locale)
      : undefined;
    const sheet = await this.prisma.archerSheet.create({
      data: {
        userId,
        category: dto.category,
        title: dto.title.trim(),
        body: cleanBody(dto.body ?? templateText ?? ''),
      },
    });
    return toDto(sheet);
  }

  async update(userId: string, id: string, dto: UpdateSheetDto): Promise<SheetDto> {
    const current = await this.findOwned(userId, id);
    if (dto.strengthSteps !== undefined && current.category !== SheetCategory.STRENGTH) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'Only strength sheets have a programme',
      );
    }
    const sheet = await this.prisma.archerSheet.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.body !== undefined && { body: cleanBody(dto.body) }),
        // A programme to follow: nothing ticked on a sheet.
        ...(dto.strengthSteps !== undefined && {
          strengthSteps: cleanStrengthSteps(dto.strengthSteps.map((s) => ({ ...s, done: false }))),
        }),
      },
    });
    return toDto(sheet);
  }

  /** With its photos' files (technique sheets). */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    const photos = await this.photos.find({ sheetId: id });
    await this.prisma.archerSheet.delete({ where: { id } });
    await this.photos.removeFiles(photos);
  }

  private async findOwned(userId: string, id: string): Promise<ArcherSheet> {
    const sheet = await this.prisma.archerSheet.findFirst({ where: { id, userId } });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }
}

/** Line breaks as "\n", no blank lines at the end. */
function cleanBody(body: string): string {
  return body.replace(/\r\n?/g, '\n').trimEnd();
}

function toDto(sheet: ArcherSheet): SheetDto {
  const { id, category, title, body, createdAt, updatedAt } = sheet;
  return {
    id,
    category,
    title,
    body,
    strengthSteps: asStrengthSteps(sheet.strengthSteps),
    createdAt,
    updatedAt,
  };
}
