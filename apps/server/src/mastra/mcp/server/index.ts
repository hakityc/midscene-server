import { MCPServer } from '@mastra/mcp';
import { logger } from '../../logger';
import { mcpClient } from '../client';

let cachedServer: MCPServer | null = null;

export async function getMcpServer(): Promise<MCPServer> {
  if (cachedServer) return cachedServer;

  try {
    logger.debug('正在初始化 MCP 服务器');

    // 拉取 midscene MCP 的全部工具并原样对外暴露
    const tools = await mcpClient.getTools();

    // 启动时打印工具概览，便于排查是否成功连接上 MCP 服务器
    const toolNames = Object.keys(tools || {});
    logger.debug('MCP 服务器初始化完成', {
      toolCount: toolNames.length,
      toolNames: toolNames,
    });

    cachedServer = new MCPServer({
      name: 'midscene-bridge-server',
      version: '1.0.0',
      tools,
    });

    return cachedServer;
  } catch (error) {
    logger.error('MCP 服务器初始化失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
