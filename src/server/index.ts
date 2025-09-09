import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { setupRouter } from '../routes/index';
import { setupWebSocket } from './websocket';
import { config as appConfig } from '../config';
import { setupError } from '../utils/error';
  import { serverLogger } from '../utils/logger';

const initApp = () => {
  const app = new Hono();
  setupRouter(app);
  setupError(app);
  return app;
};

export const startServer = () => {
  // 加载环境变量
  config();

  const port = Number(process.env.PORT || '3000');
  // 创建应用
  const app = initApp()

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
