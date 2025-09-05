import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../../mcp/client';
import { createModel } from '../index';

export const taskAgent = new Agent({
  name: 'Browser Agent',
  description: '专业的任务自动化助手，帮助拆解完成各种任务',
  instructions:  '',
  model: createModel(),
  tools: await mcpClient.getTools(),
  // memory: memory,
});
