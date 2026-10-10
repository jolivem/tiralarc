import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { SessionPhoto } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { PhotoDto } from './dto/journal.dto.js';

export const MAX_PHOTOS_PER_SESSION = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];
/** Longest side, in pixels, of the stored image and of its thumbnail. The original is not kept. */
const IMAGE_SIZE = 2000;
const THUMBNAIL_SIZE = 400;
const SIGNED_URL_TTL_SECONDS = 600;

type PhotoRef = Pick<SessionPhoto, 'id' | 'sessionId' | 'userId'>;

/** Where a photo's two files live: grouped by owner, then by event. */
export function photoKeys(photo: PhotoRef): { image: string; thumbnail: string } {
  const base = `${photo.userId}/${photo.sessionId}/${photo.id}`;
  return { image: `${base}.webp`, thumbnail: `${base}-thumb.webp` };
}

const allKeys = (photos: PhotoRef[]) => photos.flatMap((photo) => Object.values(photoKeys(photo)));

const invalidImage = () =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ErrorCode.INVALID_IMAGE,
    'Expected a JPEG, PNG or WebP image',
  );

/** Photos attached to journal events. Private: scoped to the owner, read through signed URLs. */
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, sessionId: string): Promise<PhotoDto[]> {
    await this.assertOwnedSession(userId, sessionId);
    const photos = await this.prisma.sessionPhoto.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(photos.map((photo) => this.toDto(photo)));
  }

  /** Re-encodes the upload (which also drops its metadata, GPS position included) and stores it. */
  async add(userId: string, sessionId: string, file: Buffer | undefined): Promise<PhotoDto> {
    await this.assertOwnedSession(userId, sessionId);
    if (!file?.length) throw invalidImage();
    if (
      (await this.prisma.sessionPhoto.count({ where: { sessionId } })) >= MAX_PHOTOS_PER_SESSION
    ) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_PHOTOS_PER_SESSION} photos per event`,
      );
    }

    const resize = (size: number, quality: number) =>
      sharp(file)
        .rotate() // apply the camera orientation before it is dropped with the metadata
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true });
    let image: Awaited<ReturnType<typeof resize>>;
    let thumbnail: Awaited<ReturnType<typeof resize>>;
    try {
      const { format } = await sharp(file).metadata();
      if (!format || !ACCEPTED_FORMATS.includes(format)) throw invalidImage();
      [image, thumbnail] = await Promise.all([resize(IMAGE_SIZE, 82), resize(THUMBNAIL_SIZE, 75)]);
    } catch {
      throw invalidImage();
    }

    const ref = { id: randomUUID(), sessionId, userId };
    const keys = photoKeys(ref);
    await Promise.all([
      this.storage.put(keys.image, image.data, 'image/webp'),
      this.storage.put(keys.thumbnail, thumbnail.data, 'image/webp'),
    ]);
    const photo = await this.prisma.sessionPhoto.create({
      data: {
        ...ref,
        width: image.info.width,
        height: image.info.height,
        sizeBytes: image.data.length,
      },
    });
    return this.toDto(photo);
  }

  async remove(userId: string, sessionId: string, id: string): Promise<void> {
    const photo = await this.prisma.sessionPhoto.findFirst({ where: { id, sessionId, userId } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.sessionPhoto.delete({ where: { id } });
    await this.removeFiles([photo]);
  }

  /** Photos of an event about to be deleted: read them before the rows cascade away. */
  findBySession(sessionId: string): Promise<PhotoRef[]> {
    return this.prisma.sessionPhoto.findMany({
      where: { sessionId },
      select: { id: true, sessionId: true, userId: true },
    });
  }

  /** Best effort: the rows are already gone, a leftover file is only wasted space. */
  async removeFiles(photos: PhotoRef[]): Promise<void> {
    if (photos.length === 0) return;
    try {
      await this.storage.remove(allKeys(photos));
    } catch (error) {
      this.logger.error(`Could not delete the files of ${photos.length} photo(s)`, error);
    }
  }

  private async toDto(photo: SessionPhoto): Promise<PhotoDto> {
    const keys = photoKeys(photo);
    const [url, thumbnailUrl] = await Promise.all([
      this.storage.signedUrl(keys.image, SIGNED_URL_TTL_SECONDS),
      this.storage.signedUrl(keys.thumbnail, SIGNED_URL_TTL_SECONDS),
    ]);
    return {
      id: photo.id,
      url,
      thumbnailUrl,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt,
    };
  }

  private async assertOwnedSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.journalSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Session not found');
  }
}
