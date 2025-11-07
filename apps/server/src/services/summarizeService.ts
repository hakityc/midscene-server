import type { MessageInput } from '@mastra/core/agent/message-list';
import sharp from 'sharp';
import { mastra } from '../mastra';

export type SummarizeParams = {
  // 仅支持传入 DataURL（data:image/<type>;base64,<data>）
  url: string;
};

export async function summarizeImage(
  params: SummarizeParams,
): Promise<{ summary: string; imageSize: number }> {
  const { url } = params;
  if (!url || !url.startsWith('data:image/')) {
    throw new Error('summarizeImage 仅支持 DataURL（data:image/...;base64,）');
  }

  // 提取类型与数据，用于计算大小
  const match = url.match(/^data:image\/(png|jpeg);base64,(.+)$/i);
  if (!match) {
    throw new Error('无效的 DataURL，期望形如 data:image/png;base64,<...>');
  }
  // 原始类型暂不使用，统一转为 JPEG 压缩
  const base64Data = match[2];
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // 使用 sharp 进行有损压缩（最长边 1600px，JPEG 质量 70）
  const compressedBuffer = await sharp(imageBuffer)
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 70 })
    .toBuffer();

  const dataUrl = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
  const mimeType = 'jpeg';

  const messages: MessageInput[] = [
    {
      role: 'user',
      content: '帮我总结',
    },
    {
      role: 'user',
      content: JSON.stringify([
        {
          type: 'image',
          imageUrl: dataUrl,
          mimeType,
        },
      ]),
    },
  ];

  const agent = mastra.getAgent('documentSummaryAgent');

  // 由于当前 Agent 的 generate 接口期望字符串数组，这里将图片以 DataURL 形式作为第二条消息传入
  const result = await agent.generateLegacy(messages);
  const summary = result.text?.trim() || JSON.stringify(result);
  return { summary, imageSize: compressedBuffer.byteLength };
}
