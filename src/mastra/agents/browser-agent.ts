import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../mcp/client'

export const browserAgent = new Agent({
  name: 'Browser Agent',
  instructions: 'You are a helpful assistant that can browse the web.',
  model: openai('gpt-4o-mini'),
  tools: await mcpClient.getTools(),
});