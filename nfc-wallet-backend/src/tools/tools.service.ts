import { Injectable, Logger } from '@nestjs/common';
import { tools } from './tools.definition';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  /**
   * 返回所有工具的定义，供ChatService传递给AI。
   */
  getToolDefinitions() {
    return tools;
  }

  /**
   * [工具实现] 获取Injective生态的活动列表。
   * 在实际应用中，这里应该从数据库或外部API查询数据。
   */
  async get_injective_activities() {
    this.logger.log('Executing tool: get_injective_activities');
    const activities = [
      { 
        name: 'Injective Global Hackathon 2025',
        type: '活动',
        description: '一个面向全球开发者的线上黑客松，旨在激励基于Injective的创新应用。',
        reward: '总奖池 $100,000',
      },
      {
        name: '交易大师赛 第3季',
        type: '任务',
        description: '在指定的DEX上完成交易任务，瓜分每日奖池。',
        reward: '每日1,000 INJ代币',
      },
    ];
    // 工具的返回值必须是字符串，因此我们将其序列化为JSON字符串
    return JSON.stringify(activities);
  }

  // 未来可以在这里添加更多工具的实现
  // async get_wallet_balance(userId: string) { ... }
}
