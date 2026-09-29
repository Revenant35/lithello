import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule as NestBetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '../database/database.module.ts';
import { DRIZZLE, type Database } from '../database/drizzle.provider.ts';
import { createAuth } from './auth.config.ts';

@Module({
  imports: [
    NestBetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule],
      inject: [ConfigService, DRIZZLE],
      useFactory: (config: ConfigService, db: Database) => ({
        auth: createAuth(db, {
          baseURL: config.getOrThrow<string>('BETTER_AUTH_URL'),
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          trustedOrigins: config
            .getOrThrow<string>('BETTER_AUTH_TRUSTED_ORIGINS')
            .split(','),
        }),
      }),
    }),
  ],
  exports: [NestBetterAuthModule],
})
export class AuthModule {}
