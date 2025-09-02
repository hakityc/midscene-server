import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 创建一个简单的浏览器工具示例
export const browserTool = createTool({
  id: 'browserTool',
  description: '浏览器自动化工具，支持页面操作和截图等功能',
  inputSchema: z.object({
    action: z.string().describe('要执行的操作类型'),
    url: z.string().optional().describe('目标网页URL'),
    selector: z.string().optional().describe('页面元素选择器'),
    text: z.string().optional().describe('要输入的文本内容'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    message: z.string().describe('操作结果消息'),
    data: z.any().optional().describe('返回的数据'),
  }),
  execute: async ({ context }) => {
    const { action, url, selector, text } = context;
    
    // 这里应该调用实际的 Midscene MCP 工具
    // 目前返回模拟结果
    return {
      success: true,
      message: `成功执行浏览器操作: ${action}`,
      data: {
        action,
        url,
        selector,
        text,
        timestamp: new Date().toISOString(),
      },
    };
  },
});
