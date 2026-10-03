/**
 * Writes the OpenAPI contract to apps/api/openapi.json without starting the
 * server or connecting to the database. Run after `pnpm build`:
 *   pnpm --filter @tiralarc/api openapi
 * The generated file is committed: it is the source of truth for the web
 * client (packages/api-client) and the future Android/iOS clients.
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { configureApp, createOpenApiDocument } from './setup.js';

const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
configureApp(app);
const document = createOpenApiDocument(app);
writeFileSync(
  new URL('../openapi.json', import.meta.url),
  JSON.stringify(document, null, 2) + '\n',
);
await app.close();
console.log('openapi.json written');
