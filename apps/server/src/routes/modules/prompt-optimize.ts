import { Hono } from 'hono';
import { mastra } from '../../mastra';

const promptOptimizeRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt, targetAction, customOptimize, images } = await c.req.json();

    const agent = mastra.getAgent('promptOptimizationAgent');

    // 组装系统与用户消息，借助 agent 的 vNext 接口
    const system =
      `动作类型: ${targetAction || 'all'}\n${customOptimize ? `优化方向: ${customOptimize}` : ''}`.trim();

    // 使用流式接口以与现有实现保持一致
    const response: any = await agent.streamVNext([
      { role: 'system', content: system },
      {
        role: 'user',
        content: images?.length
          ? `${prompt}\n\n(已附带${images.length}张截图，作为上下文参考)`
          : prompt,
      },
    ]);

    let optimized = '';
    for await (const chunk of response.textStream) {
      optimized += chunk;
    }
    optimized = optimized?.trim();

    // 兜底
    if (!optimized) {
      optimized = prompt;
    }

    return c.json({ optimized });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

export { promptOptimizeRouter };
