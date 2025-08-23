import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Module({
  providers: [ToolsService],
  exports: [ToolsService], // 导出服务，以便其他模块可以使用
})
export class ToolsModule {}
