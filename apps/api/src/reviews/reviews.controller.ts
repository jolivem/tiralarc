import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import {
  CreateReviewDto,
  ModerateReviewDto,
  MyReviewsDto,
  PublicReviewDto,
  ReviewModerationDto,
} from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "The published reviews of the app, the latest first (visitors' home page)",
  })
  @ApiOkResponse({ type: PublicReviewDto, isArray: true })
  published(): Promise<PublicReviewDto[]> {
    return this.reviews.published();
  }

  @ApiBearerAuth()
  @Get('mine')
  @ApiOkResponse({ type: MyReviewsDto })
  mine(@CurrentUser() user: AuthenticatedUser): Promise<MyReviewsDto> {
    return this.reviews.mine(user.id);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary:
      'Rate the app and comment on it (one review a day): emailed for approval before it shows on the home page',
  })
  @ApiCreatedResponse({ type: MyReviewsDto })
  @ApiTooManyRequestsResponse({ description: 'DAILY_LIMIT_REACHED: one review a day' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<MyReviewsDto> {
    return this.reviews.create(user.id, dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('moderation')
  @ApiOperation({ summary: "The review an emailed moderation link is about (doesn't decide)" })
  @ApiQuery({ name: 'token' })
  @ApiOkResponse({ type: ReviewModerationDto })
  @ApiConflictResponse({ description: 'INVALID_REVIEW_TOKEN' })
  forModeration(@Query('token') token: string): Promise<ReviewModerationDto> {
    return this.reviews.forModeration(String(token ?? ''));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('moderation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Publish or refuse a pending review (the emailed link, once)' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'INVALID_REVIEW_TOKEN: unknown, or already decided' })
  moderate(@Body() dto: ModerateReviewDto): Promise<void> {
    return this.reviews.moderate(dto.token, dto.decision);
  }
}
