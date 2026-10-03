import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp, createOpenApiDocument } from './setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, createOpenApiDocument(app));
  }

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
