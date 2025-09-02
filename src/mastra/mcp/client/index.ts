import { MCPClient } from '@mastra/mcp';

export const mcpClient = new MCPClient({
  servers: {
    'mcp-midscene': {
      command: 'npx',
      args: ['-y', '@midscene/mcp'],
      env: {
        MIDSCENE_MODEL_NAME: 'REPLACE_WITH_YOUR_MODEL_NAME',
        OPENAI_API_KEY: 'REPLACE_WITH_YOUR_OPENAI_API_KEY',
        MCP_SERVER_REQUEST_TIMEOUT: '800000',
      },
    },
  },
});
