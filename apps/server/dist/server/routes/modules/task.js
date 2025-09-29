import { Hono } from 'hono';
import { TaskService } from '../../services/taskService.js';
const taskRouter = new Hono()
    .post('/', async (c) => {
    const { prompt } = await c.req.json();
    const taskService = new TaskService();
    const response = await taskService.plan(prompt);
    return c.json({ message: '操作成功', response });
})
    .post('/execute', async (c) => {
    const { prompt } = await c.req.json();
    const taskService = new TaskService();
    const response = await taskService.execute(prompt);
    return c.json({ message: '操作成功', response });
});
export { taskRouter };
