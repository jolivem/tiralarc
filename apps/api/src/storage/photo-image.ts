import { HttpStatus } from '@nestjs/common';
import sharp from 'sharp';
import { ApiException, ErrorCode } from '../common/errors.js';

/** Largest upload accepted (the web checks it too). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];
/** Longest side, in pixels, of the stored image and of its thumbnail. The original is not kept. */
const IMAGE_SIZE = 2000;
const THUMBNAIL_SIZE = 400;
/** How long a photo's signed links last. */
export const SIGNED_URL_TTL_SECONDS = 600;

export const invalidImage = () =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ErrorCode.INVALID_IMAGE,
    'Expected a JPEG, PNG or WebP image',
  );

export interface ProcessedImage {
  data: Buffer;
  info: { width: number; height: number };
}

/**
 * An uploaded photo (events' and sheets' alike) re-encoded as WebP, at most IMAGE_SIZE, and its
 * thumbnail: the camera's orientation applied, its metadata (GPS position included) dropped.
 * Anything but a JPEG, PNG or WebP image is refused (`INVALID_IMAGE`).
 */
export async function processPhoto(
  file: Buffer | undefined,
): Promise<{ image: ProcessedImage; thumbnail: ProcessedImage }> {
  if (!file?.length) throw invalidImage();
  const resize = (size: number, quality: number) =>
    sharp(file)
      .rotate() // apply the camera orientation before it is dropped with the metadata
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
  try {
    const { format } = await sharp(file).metadata();
    if (!format || !ACCEPTED_FORMATS.includes(format)) throw invalidImage();
    const [image, thumbnail] = await Promise.all([
      resize(IMAGE_SIZE, 82),
      resize(THUMBNAIL_SIZE, 75),
    ]);
    return { image, thumbnail };
  } catch {
    throw invalidImage();
  }
}
