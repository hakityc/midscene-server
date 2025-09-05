import { Hono } from 'hono';
import { logger } from '../middleware/logger';
// import { browserRouter } from './modules/browser';
import { operateRouter } from './modules/operate'
import { taskRouter } from './modules/task'

export const setupRouter = (app: Hono) => {
  // 全局中间件
  app.use('/operate', logger);

  // app.route('/browser', browserRouter);
  app.route('/operate', operateRouter);
  app.route('/task', taskRouter);
  // 根路径
  app.get('/', (c) => {
    return c.json({
      message: '欢迎使用 MidScene Server API',
      version: '1.0.0',
      endpoints: {
        task: '/task',
      },
    });
  });

  // 健康检查端点
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};
