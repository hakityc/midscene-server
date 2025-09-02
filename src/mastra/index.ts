import { Mastra } from '@mastra/core/mastra';
import { browserAgent } from './agents/browser-agent';
import { logger } from './logger';
// import { mcpServer } from './mcp/server';

// TODO：
// 高优先级:
// 存储配置 (必需)
// 环境变量管理 (必需)
// 中优先级:
// 内存管理 (推荐)
// 错误处理增强 (推荐)
export const mastra = new Mastra({
  agents: { browserAgent },
  // logger,
  // 注册 MCP Server - 暂时注释掉，等类型问题解决后再启用
  // mcpServers: {
  //   midsceneBrowser: mcpServer
  // },
});
