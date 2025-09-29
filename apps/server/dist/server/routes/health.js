// 健康检查状态
let browserConnected = false;
let aiServiceAvailable = true;
/**
 * 设置浏览器连接状态
 */
export function setBrowserConnected(connected) {
    browserConnected = connected;
}
/**
 * 设置 AI 服务可用状态
 */
export function setAiServiceAvailable(available) {
    aiServiceAvailable = available;
}
/**
 * 设置健康检查路由
 */
export function setupHealthRoutes(app) {
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
    // 强制重连端点
    app.post('/health/reconnect', async (c) => {
        try {
            const { OperateService } = await import('../services/operateService');
            const operateService = OperateService.getInstance();
            await operateService.forceReconnect();
            return c.json({
                status: 'success',
                message: '重连成功',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return c.json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            }, 500);
        }
    });
}
