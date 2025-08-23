import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsIn, IsArray, ValidateNested, IsOptional } from 'class-validator';

// 定义工具调用的结构
class ToolCallDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: 'function';

  @ApiProperty()
  function: { name: string; arguments: string };
}

export class MessageDto {
  @ApiProperty({ example: 'user', description: '消息发送者的角色' })
  @IsString()
  @IsIn(['user', 'assistant', 'system', 'tool'])
  role: 'user' | 'assistant' | 'system' | 'tool';

  @ApiProperty({ example: '你好呀！', description: '消息内容' })
  @IsString()
  @IsOptional() // 内容在tool_calls存在时可能为空
  content: string | null;

  @ApiProperty({ required: false, description: '工具调用ID' })
  @IsString()
  @IsOptional()
  tool_call_id?: string;

  @ApiProperty({ type: [ToolCallDto], required: false, description: 'AI请求的工具调用' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolCallDto)
  @IsOptional()
  tool_calls?: ToolCallDto[];
}

export class ChatRequestDto {
  @ApiProperty({ type: [MessageDto], description: '包含上下文的完整对话历史', example: [{ role: 'user', content: '最近 Injective 有什么活动吗？' }] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];
}

export class ChatResponseDto {
  @ApiProperty({ example: '喵~ 最近有一个超酷的交易大赛哦！', description: 'AI生成的回复' })
  @IsString()
  reply: string;
}
