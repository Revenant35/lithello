import { betterAuth } from "better-auth";
import type { PostgresJSDialect } from "kysely-postgres-js";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule as NestBetterAuthModule } from "@thallesp/nestjs-better-auth";
import { DatabaseModule } from "../database/database.module.ts";
import { POSTGRES_DIALECT } from "../database/postgres-dialect.provider.ts";

@Module({
  imports: [
    NestBetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule],
      inject: [ConfigService, POSTGRES_DIALECT],
      useFactory: (config: ConfigService, dialect: PostgresJSDialect) => ({
        auth: betterAuth({
          advanced: {
            database: {
              generateId: "uuid",
            },
          },
          baseURL: config.getOrThrow<string>("BETTER_AUTH_URL"),
          database: {
            dialect,
            type: "postgres",
          },
          emailAndPassword: {
            enabled: true,
          },
          secret: config.getOrThrow<string>("BETTER_AUTH_SECRET"),
        }),
      }),
    }),
  ],
  exports: [NestBetterAuthModule],
})
export class AuthModule {}
