import { requestLogger } from '../middleware/logger.js';
import { setupHealthRoutes } from './health.js';
import { operateRouter } from './modules/operate.js';
const initAppRoute = (c) => {
    return c.json({
        message: '欢迎使用 MidScene Server API',
        version: '1.0.0',
        endpoints: {
            task: '/task',
            operate: '/operate',
            ws: '/ws',
        },
    });
};
export const setupRouter = (app) => {
    // 全局中间件
    app.use('/operate', requestLogger);
    app.route('/operate', operateRouter);
    // 设置健康检查路由
    setupHealthRoutes(app);
    // 根路径
    app.get('/', (c) => {
        return initAppRoute(c);
    });
};
