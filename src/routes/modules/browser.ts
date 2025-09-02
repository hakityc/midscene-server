import { Hono } from 'hono';
import { mastra } from '../../mastra';

const browserRouter = new Hono().get('/demo', async (c) => {
  const browserAgent = mastra.getAgent('browserAgent');

  const response = await browserAgent.generateVNext(`1. 打开百度
2. 搜索AI
3. 点击第一条搜索结果`)

  return c.json({ response });
});

export { browserRouter };
