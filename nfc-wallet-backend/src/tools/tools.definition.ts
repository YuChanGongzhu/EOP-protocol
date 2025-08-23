export const tools = [
  {
    type: 'function',
    function: {
      name: 'get_injective_activities',
      description: '获取Injective生态系统当前正在进行的或即将开始的活动、任务和奖励列表。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  // 未来可以在这里添加更多工具，例如：
  // {
  //   type: 'function',
  //   function: {
  //     name: 'get_wallet_balance',
  //     description: '获取当前用户的钱包余额。',
  //     parameters: { type: 'object', properties: {} }
  //   }
  // }
];
