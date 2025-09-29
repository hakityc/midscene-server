import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { midsceneWrapper } from '../agents/modules/midscene-wrapper';

/**
 * Midscene AI 增强工具集合
 * 使用 Mastra 的 createTool 方式创建工具
 */

export const midsceneLocateElementTool = createTool({
  id: 'midscene_locate_element',
  description: '使用 AI 智能定位页面元素，比传统定位方式更准确',
  inputSchema: z.object({
    prompt: z.string().describe('描述要定位的元素，如"登录按钮"、"搜索框"等'),
    options: z
      .object({
        timeout: z.number().optional().describe('超时时间（毫秒）'),
        retries: z.number().optional().describe('重试次数'),
        deepThink: z.boolean().optional().describe('是否深度思考'),
      })
      .optional()
      .describe('定位选项'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.any().describe('定位结果'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async ({ context }) => {
    const { prompt, options } = context;
    try {
      const result = await midsceneWrapper.locateElement(prompt, options);
      return {
        success: true,
        result: result,
        message: `成功定位元素: ${prompt}`,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `元素定位失败: ${prompt} - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const midsceneDescribePageTool = createTool({
  id: 'midscene_describe_page',
  description: '获取当前页面的详细描述和分析',
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.string().describe('页面描述结果'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async () => {
    try {
      const description = await midsceneWrapper.describePage();
      return {
        success: true,
        result: description,
        message: '页面描述获取成功',
      };
    } catch (error) {
      return {
        success: false,
        result: '',
        message: `页面描述获取失败 - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const midsceneQueryContentTool = createTool({
  id: 'midscene_query_content',
  description: '查询页面特定内容，如文本、链接、表单等',
  inputSchema: z.object({
    prompt: z
      .string()
      .describe('查询提示，如"获取所有商品价格"、"查找联系信息"等'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.any().describe('查询结果'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async ({ context }) => {
    const { prompt } = context;
    try {
      const content = await midsceneWrapper.queryPageContent(prompt);
      return {
        success: true,
        result: content,
        message: `内容查询成功: ${prompt}`,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `内容查询失败: ${prompt} - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const midsceneAssertStateTool = createTool({
  id: 'midscene_assert_state',
  description: '验证页面是否处于特定状态',
  inputSchema: z.object({
    assertion: z
      .string()
      .describe('要验证的条件，如"页面已加载完成"、"登录成功"等'),
    message: z.string().optional().describe('验证失败时的错误消息'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.any().describe('验证结果'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async ({ context }) => {
    const { assertion, message } = context;
    try {
      const result = await midsceneWrapper.assertPageState(assertion, message);
      return {
        success: true,
        result: result,
        message: `状态验证成功: ${assertion}`,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `状态验证失败: ${assertion} - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const midsceneWaitForTool = createTool({
  id: 'midscene_wait_for',
  description: '等待页面满足特定条件',
  inputSchema: z.object({
    condition: z
      .string()
      .describe('要等待的条件，如"搜索结果出现"、"表单加载完成"等'),
    timeout: z.number().optional().describe('超时时间（毫秒），默认30秒'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.any().describe('等待结果'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async ({ context }) => {
    const { condition, timeout } = context;
    try {
      await midsceneWrapper.waitForCondition(condition, timeout);
      return {
        success: true,
        result: null,
        message: `等待条件满足: ${condition}`,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `等待条件超时: ${condition} - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const midsceneGetContextTool = createTool({
  id: 'midscene_get_context',
  description: '获取当前页面的详细上下文信息',
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean().describe('操作是否成功'),
    result: z.any().describe('页面上下文'),
    message: z.string().describe('操作结果消息'),
  }),
  execute: async () => {
    try {
      const context = await midsceneWrapper.getPageContext();
      return {
        success: true,
        result: context,
        message: '页面上下文获取成功',
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `页面上下文获取失败 - ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// 导出所有 Midscene 工具
export const midsceneTools = [
  midsceneLocateElementTool,
  midsceneDescribePageTool,
  midsceneQueryContentTool,
  midsceneAssertStateTool,
  midsceneWaitForTool,
  midsceneGetContextTool,
];
