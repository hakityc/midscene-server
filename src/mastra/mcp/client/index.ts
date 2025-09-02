import { MCPClient } from '@mastra/mcp';

export const mcpClient = new MCPClient({
  servers: {
    'mcp-midscene': {
      command: 'npx',
      args: ['-y', '@midscene/mcp'],
      env: {
        OPENAI_API_KEY: 'sk-66ec28c79d814d0d8dc59a6fb0b00680',
        MIDSCENE_MODEL_NAME: process.env.MIDSCENE_MODEL_NAME || '',
        MCP_SERVER_REQUEST_TIMEOUT: '800000',
      },
    },
  },
});
