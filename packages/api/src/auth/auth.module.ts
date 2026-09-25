import { betterAuth } from 'better-auth';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule as NestBetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '../database/database.module.ts';
import { KYSELY } from '../database/kysely.provider.ts';
import { Kysely } from 'kysely';
import type { Database } from '../database/database.type.ts';

@Module({
  imports: [
    NestBetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule],
      inject: [ConfigService, KYSELY],
      useFactory: (config: ConfigService, db: Kysely<Database>) => ({
        auth: betterAuth({
          advanced: {
            database: {
              generateId: 'uuid',
            },
          },
          baseURL: config.getOrThrow<string>('BETTER_AUTH_URL'),
          trustedOrigins: config
            .getOrThrow<string>('BETTER_AUTH_TRUSTED_ORIGINS')
            .split(','),
          database: {
            db,
            type: 'postgres',
            casing: 'snake',
          },
          emailAndPassword: {
            enabled: true,
          },
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
        }),
      }),
    }),
  ],
  exports: [NestBetterAuthModule],
})
export class AuthModule {}
