import { Hono } from 'hono';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

const operateRouter = new Hono().post('/', async (c) => {
  const { prompt } = await c.req.json();
  const agent = new AgentOverChromeBridge({
    closeNewTabsAfterDisconnect: true,
  });
  console.log(prompt);
  await agent.connectCurrentTab({
    forceSameTabNavigation: true,
  });

  await agent.ai(prompt);
  // await agent.destroy();
  return c.json({ message: '操作成功' });
});

export { operateRouter };
