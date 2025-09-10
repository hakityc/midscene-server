import { Mastra } from '@mastra/core/mastra';
import { randomUUID } from 'crypto';
import { browserAgent } from './agents/modules/browser-agent';
import { logger } from './logger';
import { getMcpServer } from './mcp/server';
import { taskAgent } from './agents/modules/task-agent';

export const mastra = new Mastra({
  agents: { browserAgent, taskAgent },
  // logger,
});
