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
import { PhotoDto, UploadPhotoDto } from './dto/journal.dto.js';
import { MAX_PHOTO_BYTES, PhotosService } from './photos.service.js';

@ApiTags('journal')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@ApiNotFoundResponse()
@Roles(Role.ARCHER)
@Controller('journal/sessions/:sessionId/photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  @ApiOperation({ summary: 'Photos of an event; the URLs are signed and expire after 10 minutes' })
  @ApiOkResponse({ type: PhotoDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<PhotoDto[]> {
    return this.photos.list(user.id, sessionId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Attach a photo (JPEG, PNG or WebP, 10 MB max); it is resized' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadPhotoDto })
  @ApiCreatedResponse({ type: PhotoDto })
  @ApiBadRequestResponse({ description: 'INVALID_IMAGE' })
  @ApiConflictResponse({ description: 'LIMIT_REACHED (10 photos per event)' })
  @ApiPayloadTooLargeResponse({ description: 'FILE_TOO_LARGE' })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @UploadedFile() file?: { buffer: Buffer },
  ): Promise<PhotoDto> {
    return this.photos.add(user.id, sessionId, file?.buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.photos.remove(user.id, sessionId, id);
  }
}
