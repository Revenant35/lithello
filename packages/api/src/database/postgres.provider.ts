import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import postgres from "postgres";

export const POSTGRES_CLIENT = Symbol("POSTGRES_CLIENT");

export function providePostgresClient(): Provider {
  return {
    provide: POSTGRES_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      postgres({
        host: config.getOrThrow<string>("POSTGRES_HOST"),
        port: Number(config.getOrThrow<string | number>("POSTGRES_PORT")),
        database: config.getOrThrow<string>("POSTGRES_DB"),
        username: config.getOrThrow<string>("POSTGRES_USER"),
        password: config.getOrThrow<string>("POSTGRES_PASSWORD"),
      }),
  };
}
