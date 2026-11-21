import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { UserAgent } from '../common/decorators/user-agent.decorator.js';
import { AuthProvider } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import {
  DemoSignInDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RegistrationDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SocialSignInDto,
  TokenPairDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Sign up with email + password; a confirmation link is emailed' })
  @ApiCreatedResponse({ type: RegistrationDto })
  @ApiConflictResponse({ description: 'EMAIL_TAKEN' })
  register(@Body() dto: RegisterDto): Promise<RegistrationDto> {
    return this.auth.register(dto);
  }

  @Post('demo')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Signs into the example journal (a made-up season, in the language asked for): read-only, ' +
      'every change is refused (DEMO_READ_ONLY)',
  })
  @ApiOkResponse({ type: TokenPairDto })
  demo(@Body() dto: DemoSignInDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.demoSignIn(dto.locale === 'en' ? 'en' : 'fr', { userAgent });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm the email address and sign in' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiBadRequestResponse({ description: 'INVALID_VERIFICATION_TOKEN' })
  verifyEmail(@Body() dto: VerifyEmailDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.verifyEmail(dto.token, { userAgent, deviceName: dto.deviceName });
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email a new confirmation link (always 202)' })
  @ApiAcceptedResponse()
  resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    return this.auth.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email a link to choose a new password (always 202)' })
  @ApiAcceptedResponse()
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password with the emailed link; signs out every session, then signs in',
  })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiBadRequestResponse({ description: 'INVALID_RESET_TOKEN' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @UserAgent() userAgent?: string,
  ): Promise<TokenPairDto> {
    return this.auth.resetPassword(dto.token, dto.password, {
      userAgent,
      deviceName: dto.deviceName,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ description: 'EMAIL_NOT_VERIFIED' })
  login(@Body() dto: LoginDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.login(dto, { userAgent });
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in / sign up with a Google ID token' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_ID_TOKEN' })
  @ApiConflictResponse({ description: 'EMAIL_TAKEN (email not verified by the provider)' })
  google(@Body() dto: SocialSignInDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.socialSignIn(AuthProvider.GOOGLE, dto, { userAgent });
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in / sign up with a Sign in with Apple identity token' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_ID_TOKEN' })
  @ApiConflictResponse({ description: 'EMAIL_TAKEN (email not verified by the provider)' })
  apple(@Body() dto: SocialSignInDto, @UserAgent() userAgent?: string): Promise<TokenPairDto> {
    return this.auth.socialSignIn(AuthProvider.APPLE, dto, { userAgent });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_REFRESH_TOKEN' })
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
