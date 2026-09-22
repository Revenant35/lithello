import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "./database/database.module.ts";
import { AuthModule } from "./auth/auth.module.ts";
import { RedisModule } from "./redis/redis.module.ts";
import { SessionModule } from "./session/session.module.ts";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    RedisModule,
    SessionModule,
  ],
})
export class AppModule {}
