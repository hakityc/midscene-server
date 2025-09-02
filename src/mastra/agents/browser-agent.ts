import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../mcp/client';
import { config } from '../../config';

// 根据环境变量动态创建模型实例
const createModel = () => {
  const { name = '', apiKey = '', baseUrl = '' } = config.model;

  return createOpenAICompatible({
    name: name,
    baseURL: baseUrl,
    apiKey: apiKey,
  })(name);
};

export const browserAgent = new Agent({
  name: 'Browser Agent',
  instructions: 'You are a helpful assistant that can browse the web.',
  model: createModel(),
  tools: await mcpClient.getTools(),
});
