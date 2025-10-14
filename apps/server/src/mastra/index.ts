import { Mastra } from '@mastra/core/mastra';
import { browserAgent } from './agents/modules/browser-agent';
import { promptOptimizationAgent } from './agents/modules/promptOptimizationAgent';
import { taskAgent } from './agents/modules/taskAgent';

export const mastra = new Mastra({
  agents: { browserAgent, taskAgent, promptOptimizationAgent },
  // logger,
});
