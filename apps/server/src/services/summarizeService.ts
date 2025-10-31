import { mastra } from '../mastra';
import { exportPageScreenshot } from './puppeteerPdfService';

export type SummarizeParams = {
  url: string;
  deviceScaleFactor?: number;
  segmentHeight?: number;
  type?: 'png' | 'jpeg';
  quality?: number;
};

export async function summarizeWebPage(params: SummarizeParams): Promise<{ summary: string; imageSize: number }>
{
  const { url, deviceScaleFactor = 2, segmentHeight, type = 'png', quality } = params;

  const image = await exportPageScreenshot({ url, deviceScaleFactor, segmentHeight, type, quality });
  const base64 = Buffer.from(image).toString('base64');
  const dataUrl = `data:image/${type};base64,${base64}`;

  const agent = mastra.getAgent('documentSummaryAgent');

  // 以简单参数形式传给 Agent。具体字段取决于 Agent 的实现，这里采用通用 messages 结构。
  const result = await agent.generate({
    messages: [
      { role: 'user', content: '请对这张网页整页截图进行结构化总结。' },
      { role: 'user', content: dataUrl },
    ],
  } as any);

  const summary = (result as any)?.text || (result as any)?.output || JSON.stringify(result);
  return { summary, imageSize: image.byteLength };
}


