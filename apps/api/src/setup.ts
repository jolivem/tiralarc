import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { ValidationError } from 'class-validator';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import type { Env } from './config/env.js';

/**
 * Applies the global HTTP configuration. Shared by main.ts, the OpenAPI
 * export script and e2e tests so they all exercise the same pipeline.
 * Routes end up under /api/v1/...
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  (app as NestExpressApplication).set('trust proxy', config.get('TRUST_PROXY', { infer: true }));

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: 'Validation failed',
          errors: errors.map((error) => ({
            field: error.property,
            constraints: Object.keys(error.constraints ?? {}),
            messages: Object.values(error.constraints ?? {}),
          })),
        }),
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Tiralarc API')
    .setDescription('Public API consumed by the web app and the mobile apps.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}
