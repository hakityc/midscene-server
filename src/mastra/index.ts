import { Mastra } from '@mastra/core/mastra';
import { browserAgent } from './agents/modules/browser-agent';
import { taskAgent } from './agents/modules/taskAgent';
import { videoDownloadAgent } from './agents/modules/video-download-agent';

export const mastra = new Mastra({
  agents: { browserAgent, taskAgent, videoDownloadAgent },
  // logger,
});
