import { Mastra } from '@mastra/core/mastra';
import { randomUUID } from 'crypto';
import { browserAgent } from './agents/modules/browser-agent';
import { logger } from './logger';
import { getMcpServer } from './mcp/server';

export const mastra = new Mastra({
  agents: { browserAgent },
  // logger,
});
