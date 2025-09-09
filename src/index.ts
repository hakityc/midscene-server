import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { setupRouter } from './routes/index';
import { setupWebSocket } from './websocket';
import { config as appConfig } from './config';
import { setupError } from './utils/error';
import { serverLogger } from './utils/logger';

// 全局错误处理，防止服务因未处理的 Promise 拒绝而停止
process.on('unhandledRejection', (reason, promise) => {
  serverLogger.error({
    type: 'unhandled_rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  }, '未处理的 Promise 拒绝');

  // 不退出进程，继续运行服务
  serverLogger.info('服务继续运行，错误已记录');
});

// 全局异常处理
process.on('uncaughtException', (error) => {
  serverLogger.fatal({
    type: 'uncaught_exception',
    message: error.message,
    stack: error.stack,
  }, '未捕获的异常');

  // 对于严重错误，可以选择退出，但这里我们选择继续运行
  serverLogger.info('服务继续运行，异常已记录');
});

// 优雅关闭处理
process.on('SIGINT', () => {
  serverLogger.info('收到 SIGINT 信号，正在优雅关闭服务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverLogger.info('收到 SIGTERM 信号，正在优雅关闭服务...');
  process.exit(0);
});

const initApp = () => {
  const app = new Hono();
  setupRouter(app);
  setupError(app);
  return app;
};

const startServer = () => {
  // 加载环境变量
  config();

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