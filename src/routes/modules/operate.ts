import { Hono } from 'hono';
import { OperateService } from '../../services/operateService';

const operateRouter = new Hono().post('/', async (c) => {
  const { prompt } = await c.req.json();
  const operateService = OperateService.getInstance();
  await operateService.execute(prompt);

  return c.json({ message: '操作成功' });
});

export { operateRouter };
