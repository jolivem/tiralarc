import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { UpdateMyRolesDto, UserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserDto> {
    return this.users.findById(user.id);
  }

  /** Lets users pick their roles (e.g. after a Google / Apple sign-up, or to become a coach too). */
  @Put('me/roles')
  @ApiOkResponse({ type: UserDto })
  updateMyRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyRolesDto,
  ): Promise<UserDto> {
    return this.users.setSelfAssignableRoles(user.id, dto.roles);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: UserDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Admins only' })
  list(): Promise<UserDto[]> {
    return this.users.list();
  }
}
