import { Mastra } from '@mastra/core/mastra';
import { browserAgent } from './agents/modules/browser-agent';
import { taskAgent } from './agents/modules/task-agent';

export const mastra = new Mastra({
  agents: { browserAgent, taskAgent },
  // logger,
});
