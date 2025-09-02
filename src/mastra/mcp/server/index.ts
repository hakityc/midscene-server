import { MCPServer } from '@mastra/mcp';
import { mcpClient } from '../client';

let cachedServer: MCPServer | null = null;

export async function getMcpServer(): Promise<MCPServer> {
  if (cachedServer) return cachedServer;

  // 拉取 midscene MCP 的全部工具并原样对外暴露
  const tools = await mcpClient.getTools();

  // 启动时打印工具概览，便于排查是否成功连接上 MCP 服务器
  const toolNames = Object.keys(tools || {});
  console.log('[MCP Server] Loaded tools:', toolNames.length, toolNames);

  cachedServer = new MCPServer({
    name: 'midscene-bridge-server',
    version: '1.0.0',
    tools,
  });

  return cachedServer;
}


