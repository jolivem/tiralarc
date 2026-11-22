import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { PhotoDto, UploadPhotoDto } from '../journal/dto/journal.dto.js';
import { MAX_PHOTO_BYTES } from '../storage/photo-image.js';
import { SheetPhotosService } from './sheet-photos.service.js';

/** Photos of the binder's technique sheets (4 each). */
@ApiTags('sheets')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@ApiNotFoundResponse()
@Roles(Role.ARCHER)
@Controller('sheets/:sheetId/photos')
export class SheetPhotosController {
  constructor(private readonly photos: SheetPhotosService) {}

  @Get()
  @ApiOperation({ summary: 'Photos of a sheet; the URLs are signed and expire after 10 minutes' })
  @ApiOkResponse({ type: PhotoDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sheetId', new ParseUUIDPipe()) sheetId: string,
  ): Promise<PhotoDto[]> {
    return this.photos.list(user.id, sheetId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  @ApiOperation({
    summary: 'Attach a photo to a TECHNIQUE sheet (JPEG, PNG or WebP, 10 MB max); it is resized',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadPhotoDto })
  @ApiCreatedResponse({ type: PhotoDto })
  @ApiBadRequestResponse({ description: 'INVALID_IMAGE; VALIDATION_FAILED: not a technique sheet' })
  @ApiConflictResponse({ description: 'LIMIT_REACHED (4 photos per sheet)' })
  @ApiPayloadTooLargeResponse({ description: 'FILE_TOO_LARGE' })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sheetId', new ParseUUIDPipe()) sheetId: string,
    @UploadedFile() file?: { buffer: Buffer },
  ): Promise<PhotoDto> {
    return this.photos.add(user.id, sheetId, file?.buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sheetId', new ParseUUIDPipe()) sheetId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.photos.remove(user.id, sheetId, id);
  }
}
