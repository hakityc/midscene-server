import { Hono } from 'hono';
import { mastra } from '../../mastra';

const promptOptimizeRouter = new Hono().post('/', async (c) => {
  try {
    const { prompt, targetAction, customOptimize, images } = await c.req.json();

    const agent = mastra.getAgent('promptOptimizationAgent');

    // 组装系统消息
    let system = `动作类型: ${targetAction || 'all'}`;
    if (customOptimize) {
      system += `\n优化方向: ${customOptimize}`;
    }
    system = system.trim() || '提示词优化'; // 确保不为空

    // 构建消息数组 - 使用 Vercel AI SDK 标准的 multimodal 格式
    const messages: any[] = [{ role: 'system', content: system }];

    // 构建用户消息内容
    if (images?.length) {
      // 有图片时，使用 content array 格式（Vercel AI SDK 标准）
      const contentParts: any[] = [
        {
          type: 'text',
          text: prompt || '请分析图片并优化提示词', // 确保 text 不为空
        },
      ];

      // 添加图片部分
      for (const imageData of images) {
        // 检查是否是 base64 data URL 格式
        if (
          imageData &&
          typeof imageData === 'string' &&
          imageData.startsWith('data:image/')
        ) {
          // 提取 MIME type
          const mimeTypeMatch = imageData.match(/^data:(image\/[^;]+);/);
          const mimeType = mimeTypeMatch?.[1] || 'image/png';

          // 使用 Mastra 标准格式
          contentParts.push({
            type: 'image',
            imageUrl: imageData, // ← 关键：使用 imageUrl 而不是 image
            mimeType, // 明确指定 MIME 类型
          });

          console.log(
            `📸 添加图片到消息，MIME: ${mimeType}, 长度: ${imageData.length}`,
          );
        }
      }

      messages.push({
        role: 'user',
        content: contentParts,
      });

      console.log(
        `📸 使用 multimodal 模式，包含 ${contentParts.length - 1} 张图片`,
      );
    } else {
      // 无图片时，使用纯文本
      messages.push({
        role: 'user',
        content: prompt || '请优化提示词', // 确保 content 不为空
      });
    }

    console.log('🤖 开始 AI 优化，消息:', {
      systemLength: system.length,
      promptLength: prompt.length,
      hasImages: images?.length > 0,
      imageCount: images?.length || 0,
    });

    // 调试：打印消息结构
    console.log(
      '📋 消息结构:',
      JSON.stringify(messages, null, 2).substring(0, 500),
    );

    // 使用 .generate() 方法（推荐方式）
    const response = await agent.generateVNext(messages);

    let optimized = response.text?.trim() || '';

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
