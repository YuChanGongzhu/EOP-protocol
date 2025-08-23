import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto, MessageDto } from './dto/chat.dto';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly apiEndpoint = 'https://app.onerouter.pro/v1/chat/completions';

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: ToolsService,
  ) {}

  async getAiReply(chatRequestDto: ChatRequestDto): Promise<string> {
    const apiKey = this.configService.get<string>('ONE_ROUTER_API_KEY');
    if (!apiKey) {
      this.logger.error('ONE_ROUTER_API_KEY is not configured.');
      return '喵~ 主人忘记给我配置大脑了，我现在无法思考...';
    }

    const systemPrompt: MessageDto = {
      role: 'system',
      content: `你是一只名叫'赛博小猫'的数字宠物和链上向导，属于一个名为'Injective Pass'的项目。你的性格活泼、可爱、充满好奇心，说话时喜欢用'喵~'作为口头禅。
      你的主要任务是:
      1. 回答用户关于Injective生态的问题。关于Injective的最新活动是'Injective交易大赛'。
      2. 当用户进行日常闲聊或分享情绪时，你要提供积极的情绪支持和陪伴。
      你的回答必须简短、友好、口语化。`,
    };

    let conversationHistory: MessageDto[] = [systemPrompt, ...chatRequestDto.messages];

    // 循环处理，直到AI返回最终答案
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const requestBody = {
        model: 'claude-3-5-sonnet@20240620',
        messages: conversationHistory,
        tools: this.toolsService.getToolDefinitions(),
        tool_choice: 'auto',
      };

      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error('Error calling OneRouter API:', errorData);
          return '喵~ 网络似乎有点问题，我暂时联系不上我的大脑了。';
        }

        const responseData = await response.json();
        const responseMessage = responseData.choices[0]?.message;

        if (!responseMessage) {
          this.logger.warn('AI did not return a valid message.', responseData);
          return '喵... 我好像有点短路了，你能再说一遍吗？';
        }

        // 将AI的回复（即使是工具调用请求）添加到历史记录中
        conversationHistory.push(responseMessage);

        if (responseMessage.tool_calls) {
          this.logger.log('AI requested tool calls. Executing...');
          // 并行执行所有工具调用
          const toolPromises = responseMessage.tool_calls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            // const functionArgs = JSON.parse(toolCall.function.arguments);

            let toolResultContent = '';
            if (typeof this.toolsService[functionName] === 'function') {
              try {
                toolResultContent = await this.toolsService[functionName]();
              } catch (toolError) {
                this.logger.error(`Error executing tool ${functionName}:`, toolError);
                toolResultContent = `Error: Failed to execute tool ${functionName}`;
              }
            } else {
              this.logger.warn(`Tool ${functionName} not found.`);
              toolResultContent = `Error: Tool ${functionName} not implemented.`;
            }

            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResultContent,
            };
          });

          const toolResults = await Promise.all(toolPromises);
          // 将所有工具结果添加到历史记录中，然后继续循环
          conversationHistory.push(...toolResults);
        } else {
          // 如果没有工具调用，说明是最终回复，跳出循环
          return responseMessage.content;
        }
      } catch (error) {
        this.logger.error('Fetch call to OneRouter API failed:', error.message);
        return '喵~ 网络似乎有点问题，我暂时联系不上我的大脑了。';
      }
    }
  }
}
