import { Hono } from 'hono';
import { TaskController } from '../../controllers/taskController';

const taskRouter = new Hono().post('/', async (c) => {
  const { prompt } = await c.req.json();
  const taskController = new TaskController();
  const response = await taskController.plan(prompt);
  return c.json({ message: '操作成功', response });
});

export { taskRouter };
