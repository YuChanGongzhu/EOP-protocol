import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // 假设你有一个JWT守卫

@ApiTags('Chat')
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  // @UseGuards(JwtAuthGuard) // 正式部署时应启用用户认证
  @ApiBearerAuth() // 在Swagger中显示需要Bearer Token
  @ApiOperation({ summary: '与赛博小猫进行对话' })
  @ApiResponse({ status: 201, description: '成功返回AI的回复', type: ChatResponseDto })
  @ApiResponse({ status: 400, description: '请求体格式错误' })
  @ApiResponse({ status: 401, description: '未经授权' })
  async chat(
    @Body() chatRequestDto: ChatRequestDto,
    // @Req() req, // 启用守卫后，可以从req中获取用户信息，如 req.user
  ): Promise<ChatResponseDto> {
    const reply = await this.chatService.getAiReply(chatRequestDto);
    return { reply };
  }
}
