import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { UserAgent } from '../common/decorators/user-agent.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshTokenDto, RegisterDto, TokenPairDto } from './dto/auth.dto.js';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: TokenPairDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() dto: RegisterDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.register(dto, { userAgent });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.login(dto, { userAgent });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired or reused refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.refresh(dto.refreshToken, { userAgent });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }
}
