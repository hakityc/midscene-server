import { Hono } from 'hono';
import { OperateController } from '../../controllers/operateController';

const operateRouter = new Hono().post('/', async (c) => {
  const { prompt } = await c.req.json();
  const operateController = new OperateController();
  await operateController.execute(prompt);

  return c.json({ message: '操作成功' });
});

export { operateRouter };
