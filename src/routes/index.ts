import { Hono } from 'hono';
import { logger } from '../middleware/logger';
// import { browserRouter } from './modules/browser';
import { operateRouter } from './modules/operate'
import { taskRouter } from './modules/task'
import { AppError } from '../server/error';

// 模拟服务状态检查
let browserConnected = false;
let aiServiceAvailable = true;

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
    // 检查关键服务状态
    const checks = {
      browser: browserConnected,
      aiService: aiServiceAvailable,
    };
    
    // 检查是否有服务不可用
    const isHealthy = Object.values(checks).every(check => check === true);
    
    return c.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    });
  });
};
