import { Hono } from 'hono';
// import { UserController } from '../controllers/userController';
import { logger } from '../middleware/logger';

export const setupRouter = (app: Hono) => {
  // 全局中间件
  app.use('*', logger);

  // // 用户控制器
  // const userController = new UserController();

  // 用户路由
  // app.get('/users', userController.getUsers);
  // app.get('/users/:id', userController.getUserById);

  // 健康检查
  // app.get('/health', (c) => {
  //   return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  // });

  // 根路径
  app.get('/', (c) => {
    return c.json({
      message: '欢迎使用 MidScene Server API',
      version: '1.0.0',
      endpoints: {
        users: '/users',
        health: '/health'
      }
    });
  });
};
