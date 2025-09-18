import { serve } from '@hono/node-server';
import "dotenv/config"
import { Hono } from 'hono';
import { setupRouter } from './routes/index';
import { setupError } from './utils/error';
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler';
import { serverLogger } from './utils/logger';
import { setupWebSocket } from './websocket';

const initApp = () => {
  const app = new Hono();
  setupRouter(app);
  setupError(app);
  return app;
};

const startServer = () => {
  // 设置全局错误处理
  setupGlobalErrorHandlers();

  const port = Number(process.env.PORT || '3000');
  // 创建应用
  const app = initApp();

  // 设置 WebSocket
  const { injectWebSocket } = setupWebSocket(app);

  // 启动服务器
  const server = serve({
    fetch: app.fetch,
    port: port,
  });

  // 注入 WebSocket
  injectWebSocket(server);

  serverLogger.info({ port }, '服务启动成功');
};

startServer();
