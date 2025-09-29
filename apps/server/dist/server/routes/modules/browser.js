import { Hono } from 'hono';
import { BrowserService } from '../../services/browserService.js';
const browserRouter = new Hono().post('/', async (c) => {
    // 从请求体中获取 prompt
    const body = await c.req.json();
    const prompt = body.prompt;
    if (!prompt) {
        return c.json({
            error: '缺少必要参数',
            message: '请提供 prompt 参数',
        }, 400);
    }
    const browserService = new BrowserService();
    const result = await browserService.executeBrowserTask(prompt);
    // 根据结果返回相应的响应
    if (result.success) {
        return c.json({
            ...result.data,
            metadata: result.metadata,
        });
    }
    else {
        const statusCode = result.metadata?.parseError ? 422 : 500;
        return c.json({
            error: result.error,
            details: result.details,
            metadata: result.metadata,
        }, statusCode);
    }
});
export { browserRouter };
