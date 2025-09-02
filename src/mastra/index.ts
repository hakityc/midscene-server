import { Mastra } from "@mastra/core/mastra";
import { browserAgent } from "./agents/browser-agent";

export const mastra = new Mastra({
  agents: { browserAgent }
});