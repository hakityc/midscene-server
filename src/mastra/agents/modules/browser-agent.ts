import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../../mcp/client';
import dotenv from 'dotenv';
import { instructions } from '../prompt';
import { createModel } from '../index';
// import { memory } from '../memory';

export const browserAgent = new Agent({
  name: 'Browser Agent',
  description: '专业的浏览器自动化助手，通过 Midscene MCP 工具来操控浏览器，帮助用户完成各种网页操作任务',
  instructions: instructions,
  model: createModel(),
  tools: await mcpClient.getTools(),
  // memory: memory,
});
