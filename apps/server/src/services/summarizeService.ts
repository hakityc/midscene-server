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
  const base64Data = match[2];
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const dataUrl = url;

  const agent = mastra.getAgent('documentSummaryAgent');

  // 由于当前 Agent 的 generate 接口期望字符串数组，这里将图片以 DataURL 形式作为第二条消息传入
  const result = await agent.generateLegacy([
    '请对这张网页整页截图进行结构化总结。',
    dataUrl,
  ]);
  const summary = result.text?.trim() || JSON.stringify(result);
  return { summary, imageSize: imageBuffer.byteLength };
}
