import { Hono } from 'hono';
import { OperateController } from '../../controllers/operateController';
import { AppError } from '../../server/error';
import { errorResponse } from '../../utils/response';

const operateRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt } = await c.req.json();
    
    // 验证参数
    if (!prompt) {
      return errorResponse(c, 'Prompt is required', 400);
    }
    
    const operateController = new OperateController();
    await operateController.connectCurrentTab({
      forceSameTabNavigation: true,
      tabId: 0, // 默认使用第一个标签页
    });
    await operateController.execute(prompt);

    return c.json({ message: '操作成功' });
  } catch (error: any) {
    // 处理操作过程中的错误
    if (error instanceof AppError) {
      return errorResponse(c, error.message, error.statusCode);
    }
    
    // 处理浏览器连接错误
    if (error.message && error.message.includes('connect')) {
      return errorResponse(c, 'Browser connection failed', 503);
    }
    
    // 处理AI执行错误
    if (error.message && error.message.includes('ai')) {
      return errorResponse(c, 'AI execution failed', 500);
    }
    
    // 其他未知错误
    console.error('Operate error:', error);
    return errorResponse(c, 'Operation failed', 500);
  }
});

export { operateRouter };
