import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../mcp/client';
import dotenv from 'dotenv';
import { instructions } from './prompt';
// import { memory } from '../memory';

// 根据环境变量动态创建模型实例
const createModel = () => {
  dotenv.config();
  const name = process.env.MIDSCENE_MODEL_NAME || '';
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL || '';

  console.log('Model config:', {
    name,
    apiKey: apiKey ? 'Set' : 'Not set',
    baseUrl,
  });

  // 验证必要的环境变量
  if (!name) {
    throw new Error('MIDSCENE_MODEL_NAME 环境变量未设置');
  }
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 环境变量未设置');
  }
  if (!baseUrl) {
    throw new Error('OPENAI_BASE_URL 环境变量未设置');
  }

  // 验证 baseUrl 是否为有效的 URL
  try {
    new URL(baseUrl);
  } catch (error) {
    throw new Error(
      `OPENAI_BASE_URL 不是有效的 URL: ${baseUrl}。请确保包含协议（如 https://）`
    );
  }

  return createOpenAICompatible({
    name: name,
    baseURL: baseUrl,
    apiKey: apiKey,
  })(name);
};

export const browserAgent = new Agent({
  name: 'Browser Agent',
  description: '专业的浏览器自动化助手，通过 Midscene MCP 工具来操控浏览器，帮助用户完成各种网页操作任务',
  instructions: instructions,
  model: createModel(),
  tools: await mcpClient.getTools(),
  // memory: memory,
});
