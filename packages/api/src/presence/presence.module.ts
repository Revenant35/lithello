import { Module } from "@nestjs/common";
import { PresenceService } from "./presence.service.ts";
import { PresenceTasks } from "./presence.tasks.ts";
import { RedisModule } from "../redis/redis.module.ts";

@Module({
  imports: [RedisModule],
  providers: [PresenceService, PresenceTasks],
  exports: [PresenceService],
})
export class PresenceModule {}
