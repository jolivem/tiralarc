import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type SheetPhoto, SheetCategory } from '../generated/prisma/client.js';
import type { PhotoDto } from '../journal/dto/journal.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { processPhoto, SIGNED_URL_TTL_SECONDS } from '../storage/photo-image.js';
import { StorageService } from '../storage/storage.service.js';

/** Photos only on technique sheets, at most this many each. */
export const MAX_PHOTOS_PER_SHEET = 4;
export const PHOTO_CATEGORIES: readonly SheetCategory[] = [SheetCategory.TECHNIQUE];

type PhotoRef = Pick<SheetPhoto, 'id' | 'sheetId' | 'userId'>;

/** Where a sheet photo's two files live: by owner, apart from the events' photos. */
export function sheetPhotoKeys(photo: PhotoRef): { image: string; thumbnail: string } {
  const base = `${photo.userId}/sheets/${photo.sheetId}/${photo.id}`;
  return { image: `${base}.webp`, thumbnail: `${base}-thumb.webp` };
}

/**
 * Photos of the binder's technique sheets (a posture, a drill…), stored like the events' ones:
 * re-encoded, read back through signed links, files removed with their sheet or account.
 */
@Injectable()
export class SheetPhotosService {
  private readonly logger = new Logger(SheetPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** The photos of a sheet of `userId`'s, oldest first. */
  async list(userId: string, sheetId: string): Promise<PhotoDto[]> {
    await this.ownedSheet(userId, sheetId);
    const photos = await this.prisma.sheetPhoto.findMany({
      where: { sheetId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(photos.map((photo) => this.toDto(photo)));
  }

  async add(userId: string, sheetId: string, file: Buffer | undefined): Promise<PhotoDto> {
    const sheet = await this.ownedSheet(userId, sheetId);
    if (!PHOTO_CATEGORIES.includes(sheet.category)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'Only technique sheets take photos',
      );
    }
    if ((await this.prisma.sheetPhoto.count({ where: { sheetId } })) >= MAX_PHOTOS_PER_SHEET) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_PHOTOS_PER_SHEET} photos per sheet`,
      );
    }
    const { image, thumbnail } = await processPhoto(file);
    const ref = { id: randomUUID(), sheetId, userId };
    const keys = sheetPhotoKeys(ref);
    await Promise.all([
      this.storage.put(keys.image, image.data, 'image/webp'),
      this.storage.put(keys.thumbnail, thumbnail.data, 'image/webp'),
    ]);
    const photo = await this.prisma.sheetPhoto.create({
      data: {
        ...ref,
        width: image.info.width,
        height: image.info.height,
        sizeBytes: image.data.length,
      },
    });
    return this.toDto(photo);
  }

  async remove(userId: string, sheetId: string, id: string): Promise<void> {
    const photo = await this.prisma.sheetPhoto.findFirst({ where: { id, sheetId, userId } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.sheetPhoto.delete({ where: { id } });
    await this.removeFiles([photo]);
  }

  /** Photos about to go with their sheet or account: read them before the rows cascade away. */
  find(where: { sheetId: string } | { userId: string }): Promise<PhotoRef[]> {
    return this.prisma.sheetPhoto.findMany({
      where,
      select: { id: true, sheetId: true, userId: true },
    });
  }

  /** Best effort: the rows are already gone, a leftover file is only wasted space. */
  async removeFiles(photos: PhotoRef[]): Promise<void> {
    if (photos.length === 0) return;
    try {
      await this.storage.remove(photos.flatMap((photo) => Object.values(sheetPhotoKeys(photo))));
    } catch (error) {
      this.logger.error(`Could not delete the files of ${photos.length} sheet photo(s)`, error);
    }
  }

  private async toDto(photo: SheetPhoto): Promise<PhotoDto> {
    const keys = sheetPhotoKeys(photo);
    const [url, thumbnailUrl] = await Promise.all([
      this.storage.signedUrl(keys.image, SIGNED_URL_TTL_SECONDS),
      this.storage.signedUrl(keys.thumbnail, SIGNED_URL_TTL_SECONDS),
    ]);
    const { id, width, height, createdAt } = photo;
    return { id, url, thumbnailUrl, width, height, createdAt };
  }

  private async ownedSheet(userId: string, sheetId: string) {
    const sheet = await this.prisma.archerSheet.findFirst({
      where: { id: sheetId, userId },
      select: { id: true, category: true },
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }
}
