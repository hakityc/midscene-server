import { Hono } from 'hono';
// import { UserController } from '../controllers/userController';
import { logger } from '../middleware/logger';
import { browserRouter } from './modules/browser';

export const setupRouter = (app: Hono) => {
  // 全局中间件
  app.use('*', logger);

  app.route('/browser', browserRouter);
  // 根路径
  app.get('/', (c) => {
    return c.json({
      message: '欢迎使用 MidScene Server API',
      version: '1.0.0',
      endpoints: {
        browser: '/browser/demo',
      },
    });
  });
};
