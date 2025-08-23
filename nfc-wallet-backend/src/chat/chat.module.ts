import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@nestjs/config';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [
    ConfigModule,
    ToolsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
