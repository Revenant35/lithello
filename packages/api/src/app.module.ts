import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LobbyModule } from './lobby/lobby.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), LobbyModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
