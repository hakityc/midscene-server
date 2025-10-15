import { Hono } from 'hono';
import { mastra } from '../../mastra';

const promptOptimizeRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt, targetAction, customOptimize, images } = await c.req.json();

    const agent = mastra.getAgent('promptOptimizationAgent');

    // 组装系统消息
    const system =
      `动作类型: ${targetAction || 'all'}\n${customOptimize ? `优化方向: ${customOptimize}` : ''}`.trim();

    // 构建消息数组 - 使用 Vercel AI SDK 标准的 multimodal 格式
    const messages: any[] = [
      { role: 'system', content: system },
    ];

    // 构建用户消息内容
    if (images?.length) {
      // 有图片时，使用 content array 格式（Vercel AI SDK 标准）
      const contentParts: any[] = [
        { type: 'text', text: prompt },
      ];

      // 添加图片部分
      for (const imageData of images) {
        // 检查是否是 base64 data URL 格式
        if (imageData.startsWith('data:image/')) {
          contentParts.push({
            type: 'image',
            image: imageData, // data URL 格式
          });
        }
      }

      messages.push({
        role: 'user',
        content: contentParts,
      });

      console.log(`📸 使用 multimodal 模式，包含 ${images.length} 张图片`);
    } else {
      // 无图片时，使用纯文本
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    console.log('🤖 开始 AI 优化，消息:', {
      systemLength: system.length,
      promptLength: prompt.length,
      hasImages: images?.length > 0,
      imageCount: images?.length || 0,
    });

    // 使用流式接口
    const response: any = await agent.streamVNext(messages);

    let optimized = '';
    for await (const chunk of response.textStream) {
      optimized += chunk;
    }
    optimized = optimized?.trim();

    // 兜底
    if (!optimized) {
      console.warn('⚠️ AI 返回空结果，使用原提示词');
      optimized = prompt;
    }

    console.log(
      '✅ AI 优化完成，原长度:',
      prompt.length,
      '优化后长度:',
      optimized.length,
    );

    return c.json({ optimized });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ 提示词优化失败:', {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: message }, 500);
  }
});

export { promptOptimizeRouter };
