import { Readable } from 'node:stream';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { AccountService } from './account.service.js';
import { DeleteAccountDto } from './dto/account.dto.js';
import { zipStream } from './zip.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Deletes the signed-in account and everything in it (journals, events, photos, goals, ' +
      'profile, invitations, coaching links). Cannot be undone.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: "VALIDATION_FAILED: the email is not the account's" })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS: wrong or missing password' })
  delete(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto): Promise<void> {
    return this.account.delete(user.id, dto);
  }

  @Get('export')
  @ApiOperation({
    summary:
      "All the account's data, as a ZIP archive: `mes-donnees.json` (account, profile, " +
      'journals, events, goals, invitations, reviews, what was written as a coach), the photos ' +
      '(`photos/<day>_<event id>/<photo id>.webp`) and the score sheets (PDF).',
  })
  @ApiProduces('application/zip')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  export(@CurrentUser() user: AuthenticatedUser): StreamableFile {
    const day = new Date().toISOString().slice(0, 10);
    return new StreamableFile(Readable.from(zipStream(this.account.export(user.id))), {
      type: 'application/zip',
      disposition: `attachment; filename="myarcherydiary-${day}.zip"`,
    });
  }
}
