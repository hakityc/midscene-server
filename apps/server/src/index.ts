import { serve } from '@hono/node-server';
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setupHealthRoutes } from './routes/health';
import { setupRouter } from './routes/index';
import { setupError } from './utils/error';
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler';
import { serverLogger } from './utils/logger';
import { ensurePortAvailable } from './utils/portManager';
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

  // 检查并释放端口
  const portAvailable = await ensurePortAvailable(port);
  if (!portAvailable) {
    serverLogger.error({ port }, '❌ 端口不可用，服务启动失败');
    process.exit(1);
  }

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

  // 启动服务器，添加错误处理
  try {
    const server = serve(
      {
        fetch: app.fetch,
        port: port,
      },
      (info) => {
        // 这个回调在服务器成功启动后才会执行
        serverLogger.info({ port: info.port }, '✅ 服务启动成功');
      },
    );

    // 监听服务器错误
    server.on('error', (error: Error) => {
      serverLogger.error({ error, port }, '❌ 服务器错误');
      if (error.message.includes('EADDRINUSE')) {
        serverLogger.error(
          { port },
          '❌ 端口被占用，请检查是否有其他进程在使用该端口',
        );
        process.exit(1);
      }
    });

    // 注入 WebSocket
    injectWebSocket(server);
  } catch (error) {
    serverLogger.error({ error, port }, '❌ 启动服务器失败');
    process.exit(1);
  }
};

startServer();
