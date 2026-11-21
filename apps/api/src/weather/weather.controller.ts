import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Sky, Wind } from '../generated/prisma/client.js';
import { WeatherService } from './weather.service.js';

export class WeatherDto {
  @ApiProperty({ enum: Object.values(Sky), enumName: 'Sky', nullable: true })
  sky!: Sky | null;

  @ApiProperty({ enum: Object.values(Wind), enumName: 'Wind', nullable: true })
  wind!: Wind | null;

  @ApiProperty({ type: Number, nullable: true, example: 17, description: "The day's highest, °C." })
  temperatureC!: number | null;

  @ApiProperty({
    example: 'Rennes',
    description: "Where it was looked up: the event's place, or the archer's home town.",
  })
  place!: string;
}

@ApiTags('journal')
@ApiBearerAuth()
@Controller('journal/sessions')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get(':id/weather')
  @ApiOperation({
    summary:
      "The weather of the event's day (Open-Meteo), as the sheet notes it, to fill in its sky, " +
      'wind and temperature. Nothing is saved.',
  })
  @ApiOkResponse({ type: WeatherDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED: the day is still to come' })
  @ApiUnprocessableEntityResponse({
    description: 'WEATHER_UNAVAILABLE: no place found on the map, or the service unreachable',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<WeatherDto> {
    return this.weather.forSession(user.id, id);
  }
}
