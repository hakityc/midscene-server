import { Mastra } from '@mastra/core/mastra';
import { randomUUID } from 'crypto';
import { browserAgent } from './agents/browser-agent';
import { logger } from './logger';
import { getMcpServer } from './mcp/server';

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
  server: {
    apiRoutes: [
      {
        path: '/api/mcp/midscene/mcp',
        method: 'ALL',
        createHandler: async () => {
          const server = await getMcpServer();
          return async (req: any, res: any) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            await server.startHTTP({
              url,
              httpPath: '/api/mcp/midscene/mcp',
              req,
              res,
              options: {
                enableJsonResponse: false,
                sessionIdGenerator: () => randomUUID(),
              },
            });
          };
        },
      },
      {
        path: '/api/mcp/midscene/sse',
        method: 'ALL',
        createHandler: async () => {
          const server = await getMcpServer();
          return async (req: any, res: any) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            await server.startSSE({
              url,
              ssePath: '/api/mcp/midscene/sse',
              messagePath: '/api/mcp/midscene/message',
              req,
              res,
            });
          };
        },
      },
    ],
  },
});
