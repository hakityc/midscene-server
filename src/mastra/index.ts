import { Mastra } from '@mastra/core/mastra';
import { taskAgent } from './agents/modules/taskAgent';

export const mastra = new Mastra({
  agents: { taskAgent },
  // logger,
});
