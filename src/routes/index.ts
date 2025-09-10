import type { Hono } from 'hono';
import { requestLogger } from '../middleware/logger';
import { operateRouter } from './modules/operate';

// 模拟服务状态检查
const browserConnected = false;
const aiServiceAvailable = true;

export const setupRouter = (app: Hono) => {
  // 全局中间件
  app.use('/operate', requestLogger);

  app.route('/operate', operateRouter);
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
    const isHealthy = Object.values(checks).every((check) => check === true);

    return c.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    });
  });
};
