import { Injectable, OnModuleInit } from "@nestjs/common";
import { PresenceService } from "./presence.service.ts";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class PresenceTasks implements OnModuleInit {
  constructor(private readonly service: PresenceService) {}

  async onModuleInit(): Promise<void> {
    await this.service.registerProcess();
  }

  @Cron(CronExpression.EVERY_5_SECONDS, { waitForCompletion: true })
  async heartbeat(): Promise<void> {
    await this.service.refreshHeartbeat();
  }

  @Cron(CronExpression.EVERY_5_SECONDS, { waitForCompletion: true })
  async cleanup(): Promise<void> {
    await this.service.cleanupDeadProcesses();
  }
}
