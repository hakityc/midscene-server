import { Hono } from 'hono';
import { TaskController } from '../../controllers/taskController';
import { AppError } from '../../server/error';
import { errorResponse } from '../../utils/response';

const taskRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt } = await c.req.json();
    
    // 验证参数
    if (!prompt) {
      return errorResponse(c, 'Prompt is required', 400);
    }
    
    const taskController = new TaskController();
    const response = await taskController.plan(prompt);
    return c.json({ message: '操作成功', response });
  } catch (error: any) {
    // 处理任务规划过程中的错误
    if (error instanceof AppError) {
      return errorResponse(c, error.message, error.statusCode);
    }
    
    // 处理AI执行错误
    if (error.message && error.message.includes('ai')) {
      return errorResponse(c, 'AI execution failed', 500);
    }
    
    // 其他未知错误
    console.error('Task error:', error);
    return errorResponse(c, 'Task planning failed', 500);
  }
});

export { taskRouter };
