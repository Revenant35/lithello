import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { LobbyModule } from './lobby/lobby.module.ts';
import { RedisModule } from './redis/redis.module.ts';
import { PresenceModule } from './presence/presence.module.ts';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.ts';
import { PlayerModule } from './player/player.module.ts';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    LobbyModule,
    RedisModule,
    PresenceModule,
    DatabaseModule,
    AuthModule,
    PlayerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
