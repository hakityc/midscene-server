import { MCPClient } from '@mastra/mcp';
import dotenv from 'dotenv';

dotenv.config();
export const mcpClient = new MCPClient({
  servers: {
    'mcp-midscene': {
      command: 'npx',
      args: ['-y', '@midscene/mcp'],
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        MIDSCENE_MODEL_NAME: process.env.MIDSCENE_MODEL_NAME || '',
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
        MCP_SERVER_REQUEST_TIMEOUT: '800000',
      },
    },
  },
});
