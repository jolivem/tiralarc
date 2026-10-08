import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  AcceptedInvitationDto,
  AcceptInvitationDto,
  CreateInvitationDto,
  CreateSiteDto,
  InvitationDto,
  ProfileDto,
  SiteDto,
  UpdateProfileDto,
} from './dto/profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('profile')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: ProfileDto })
  get(@CurrentUser() user: AuthenticatedUser): Promise<ProfileDto> {
    return this.profile.get(user.id);
  }

  @Patch()
  @ApiOkResponse({ type: ProfileDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.profile.update(user.id, dto);
  }

  @Get('invitations')
  @ApiOkResponse({ type: InvitationDto, isArray: true })
  listInvitations(@CurrentUser() user: AuthenticatedUser): Promise<InvitationDto[]> {
    return this.profile.listInvitations(user.id);
  }

  @Post('invitations')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Invite someone; they receive an email with a link to accept' })
  @ApiCreatedResponse({ type: InvitationDto })
  @ApiBadRequestResponse({ description: 'CANNOT_INVITE_SELF' })
  @ApiConflictResponse({ description: 'INVITATION_ALREADY_SENT, LIMIT_REACHED' })
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    return this.profile.invite(user.id, dto);
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  removeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.profile.removeInvitation(user.id, id);
  }

  @Get('sites')
  @ApiOkResponse({ type: SiteDto, isArray: true })
  listSites(@CurrentUser() user: AuthenticatedUser): Promise<SiteDto[]> {
    return this.profile.listSites(user.id);
  }

  @Post('sites')
  @ApiCreatedResponse({ type: SiteDto })
  @ApiConflictResponse({ description: 'LIMIT_REACHED' })
  addSite(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSiteDto): Promise<SiteDto> {
    return this.profile.addSite(user.id, dto);
  }

  @Delete('sites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  removeSite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.profile.removeSite(user.id, id);
  }
}

/** The guest's side of an invitation: no account needed, the emailed token is the proof. */
@ApiTags('profile')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly profile: ProfileService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AcceptedInvitationDto })
  @ApiBadRequestResponse({ description: 'INVALID_INVITATION_TOKEN' })
  accept(@Body() dto: AcceptInvitationDto): Promise<AcceptedInvitationDto> {
    return this.profile.acceptInvitation(dto.token);
  }
}
