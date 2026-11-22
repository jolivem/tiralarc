import { Injectable, NotFoundException } from '@nestjs/common';
import type { SheetCategory, SheetTemplate } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SheetTemplateDto } from './dto/sheet.dto.js';
import type {
  AdminSheetTemplateDto,
  CreateSheetTemplateDto,
  MoveSheetTemplateDto,
  UpdateSheetTemplateDto,
} from './dto/sheet-template.dto.js';

/** English for "en…", else French: the templates' two languages. */
export const templateLanguage = (locale: string) => (locale.startsWith('en') ? 'en' : 'fr');

const ORDER = [{ category: 'asc' }, { position: 'asc' }] as const;

/**
 * Ready-made sheets: offered to the archers in their language when they add a sheet (hidden
 * ones left out), written in both languages by the admins.
 */
@Injectable()
export class SheetTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** What "+" offers: by category then in their order, in `locale` (else the account's). */
  async offered(
    userId: string,
    category?: SheetCategory,
    locale?: string,
  ): Promise<SheetTemplateDto[]> {
    const language = templateLanguage(locale ?? (await this.accountLocale(userId)));
    const templates = await this.prisma.sheetTemplate.findMany({
      where: { hidden: false, ...(category && { category }) },
      orderBy: [...ORDER],
    });
    return templates.map((template) => inLanguage(template, language));
  }

  /** A template's text to start a sheet of `category` with (a hidden one is not found). */
  async text(userId: string, id: string, category: SheetCategory, locale?: string) {
    const template = await this.prisma.sheetTemplate.findFirst({
      where: { id, category, hidden: false },
    });
    if (!template) throw new NotFoundException('Template not found');
    return inLanguage(template, templateLanguage(locale ?? (await this.accountLocale(userId))))
      .body;
  }

  // ------------------------------------------------------------------- admins

  async list(): Promise<AdminSheetTemplateDto[]> {
    return (await this.prisma.sheetTemplate.findMany({ orderBy: [...ORDER] })).map(toAdminDto);
  }

  /** At the end of its category. */
  async create(dto: CreateSheetTemplateDto): Promise<AdminSheetTemplateDto> {
    const template = await this.prisma.sheetTemplate.create({
      data: {
        category: dto.category,
        titleFr: dto.titleFr.trim(),
        bodyFr: cleanBody(dto.bodyFr),
        titleEn: dto.titleEn.trim(),
        bodyEn: cleanBody(dto.bodyEn),
        hidden: dto.hidden ?? false,
        position: await this.nextPosition(dto.category),
      },
    });
    return toAdminDto(template);
  }

  async update(id: string, dto: UpdateSheetTemplateDto): Promise<AdminSheetTemplateDto> {
    const current = await this.find(id);
    const moved = dto.category !== undefined && dto.category !== current.category;
    const template = await this.prisma.sheetTemplate.update({
      where: { id },
      data: {
        ...(moved && { category: dto.category, position: await this.nextPosition(dto.category!) }),
        ...(dto.titleFr !== undefined && { titleFr: dto.titleFr.trim() }),
        ...(dto.bodyFr !== undefined && { bodyFr: cleanBody(dto.bodyFr) }),
        ...(dto.titleEn !== undefined && { titleEn: dto.titleEn.trim() }),
        ...(dto.bodyEn !== undefined && { bodyEn: cleanBody(dto.bodyEn) }),
        ...(dto.hidden !== undefined && { hidden: dto.hidden }),
      },
    });
    if (moved) await this.renumber(current.category);
    return toAdminDto(template);
  }

  /** The sheets already started from it keep their text (it was copied). */
  async remove(id: string): Promise<void> {
    const template = await this.find(id);
    await this.prisma.sheetTemplate.delete({ where: { id } });
    await this.renumber(template.category);
  }

  /** One place up or down in its category (nothing at either end); the list in its new order. */
  async move(id: string, { direction }: MoveSheetTemplateDto): Promise<AdminSheetTemplateDto[]> {
    const template = await this.find(id);
    const siblings = await this.prisma.sheetTemplate.findMany({
      where: { category: template.category },
      orderBy: { position: 'asc' },
    });
    const from = siblings.findIndex((s) => s.id === id);
    const to = direction === 'UP' ? from - 1 : from + 1;
    if (to >= 0 && to < siblings.length) {
      [siblings[from], siblings[to]] = [siblings[to]!, siblings[from]!];
      await this.prisma.$transaction(
        siblings.map((s, i) =>
          this.prisma.sheetTemplate.update({ where: { id: s.id }, data: { position: i + 1 } }),
        ),
      );
    }
    return this.list();
  }

  private async find(id: string): Promise<SheetTemplate> {
    const template = await this.prisma.sheetTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  private async nextPosition(category: SheetCategory): Promise<number> {
    const last = await this.prisma.sheetTemplate.aggregate({
      where: { category },
      _max: { position: true },
    });
    return (last._max.position ?? 0) + 1;
  }

  /** Positions 1, 2, 3… again, in the same order (after one left the category). */
  private async renumber(category: SheetCategory): Promise<void> {
    const siblings = await this.prisma.sheetTemplate.findMany({
      where: { category },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    await this.prisma.$transaction(
      siblings.map((s, i) =>
        this.prisma.sheetTemplate.update({ where: { id: s.id }, data: { position: i + 1 } }),
      ),
    );
  }

  private async accountLocale(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    return user?.locale ?? 'fr';
  }
}

function inLanguage(template: SheetTemplate, language: 'fr' | 'en'): SheetTemplateDto {
  const { id, category } = template;
  return language === 'en'
    ? { id, category, title: template.titleEn, body: template.bodyEn }
    : { id, category, title: template.titleFr, body: template.bodyFr };
}

function toAdminDto(template: SheetTemplate): AdminSheetTemplateDto {
  const { id, category, position, hidden, titleFr, bodyFr, titleEn, bodyEn, updatedAt } = template;
  return { id, category, position, hidden, titleFr, bodyFr, titleEn, bodyEn, updatedAt };
}

/** Line breaks as "\n", no blank lines at the end. */
function cleanBody(body: string): string {
  return body.replace(/\r\n?/g, '\n').trimEnd();
}
