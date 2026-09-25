import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LobbyModule } from './lobby/lobby.module.js';

@Module({
  imports: [LobbyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
