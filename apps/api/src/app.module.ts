import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { type Env, validateEnv } from './config/env.js';
import { GoalsModule } from './goals/goals.module.js';
import { HealthModule } from './health/health.module.js';
import { JournalModule } from './journal/journal.module.js';
import { MailModule } from './mail/mail.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        // e2e tests issue many auth calls from one IP.
        skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
    PrismaModule,
    MailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    JournalModule,
    GoalsModule,
    ProfileModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
