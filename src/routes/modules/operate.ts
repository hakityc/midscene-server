import { Hono } from 'hono';
import { OperateService } from '../../services/operateService';
import { AppError } from '../../utils/error';
import { errorResponse } from '../../utils/response';

const operateRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt } = await c.req.json();

    // 验证参数
    if (!prompt) {
      return errorResponse(c, 'Prompt is required', 400);
    }

    const operateService = OperateService.getInstance();
    await operateService.connectLastTab();
    await operateService.execute(prompt);

    return c.json({ message: '操作成功' });
  } catch (error: any) {
    // 处理操作过程中的错误
    if (error instanceof AppError) {
      return errorResponse(c, error.message, error.statusCode);
    }

    // 处理浏览器连接错误
    if (error.message?.includes('connect')) {
      return errorResponse(c, 'Browser connection failed', 503);
    }

    // 处理AI执行错误
    if (error.message?.includes('ai')) {
      return errorResponse(c, 'AI execution failed', 500);
    }

    // 其他未知错误
    console.error('Operate error:', error);
    return errorResponse(c, 'Operation failed', 500);
  }
});

export { operateRouter };
