import { serve } from '@hono/node-server';
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setupHealthRoutes } from './routes/health';
import { setupRouter } from './routes/index';
import { setupError } from './utils/error';
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler';
import { serverLogger } from './utils/logger';
import { setupWebSocket } from './websocket';

const initApp = () => {
  const app = new Hono();

  // 全局 CORS 配置
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  setupRouter(app);
  setupError(app);
  setupHealthRoutes(app); // 添加健康检查路由
  return app;
};

const startServer = async () => {
  // 设置全局错误处理
  setupGlobalErrorHandlers();

  const port = Number(process.env.PORT || '3000');

  // 预初始化 WebOperateService
  try {
    console.log('�� 预初始化 WebOperateService...');
    // TODO: 使用 MCP 就不需要这里初始化了
    // const webOperateService = WebOperateService.getInstance()
    // await webOperateService.start()
    console.log('✅ WebOperateService 预初始化完成');
  } catch (error) {
    console.error('❌ WebOperateService 预初始化失败:', error);
    // 不退出服务，让后续请求时重试
  }
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
