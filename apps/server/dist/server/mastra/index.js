import { Mastra } from '@mastra/core/mastra';
import { browserAgent } from './agents/modules/browser-agent.js';
import { taskAgent } from './agents/modules/taskAgent.js';
export const mastra = new Mastra({
    agents: { browserAgent, taskAgent },
    // logger,
});
