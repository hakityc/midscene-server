import { Hono } from 'hono';
import { z } from 'zod';
import { summarizeWebPageWithMidscene } from '../../services/summarizeWithMidsceneService';

const summarizeRouter = new Hono();

// 定义请求 Schema
const SummarizeBodySchema = z.object({
  url: z.string().url('必须是有效的 URL'),
  fullPage: z.boolean().optional(),
  locate: z
    .object({
      id: z.string(),
      rect: z.object({
        left: z.number(),
        top: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      center: z.tuple([z.number(), z.number()]),
      content: z.string(),
      attributes: z.record(z.any()),
    })
    .optional(),
});

/**
 * POST /api/summarize-with-midscene
 *
 * 使用 Midscene SDK 的新截图功能进行网页总结
 *
 * 示例请求：
 * ```bash
 * curl -X POST http://localhost:3000/api/summarize-with-midscene \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "url": "https://example.com",
 *     "fullPage": true
 *   }'
 * ```
 *
 * 带 locate 参数的示例：
 * ```bash
 * curl -X POST http://localhost:3000/api/summarize-with-midscene \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "url": "https://feishu.cn/docs/xxx",
 *     "fullPage": true,
 *     "locate": {
 *       "id": "content-area",
 *       "rect": {"left": 100, "top": 200, "width": 800, "height": 1200},
 *       "center": [500, 800],
 *       "content": "文档内容区域",
 *       "attributes": {}
 *     }
 *   }'
 * ```
 */
summarizeRouter.post('/', async (c) => {
  try {
    const json = await c.req.json().catch(() => null);
    const parsed = SummarizeBodySchema.safeParse(json);

    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: '请求参数验证失败',
          details: parsed.error.flatten(),
        },
        400,
      );
    }

    console.log('开始使用 Midscene 进行网页总结:', {
      url: parsed.data.url,
      fullPage: parsed.data.fullPage,
      hasLocate: !!parsed.data.locate,
    });

    const result = await summarizeWebPageWithMidscene(parsed.data);

    return c.json({
      ok: true,
      data: {
        summary: result.summary,
        imageSize: result.imageSize,
        locateRect: result.locateRect,
        config: {
          url: parsed.data.url,
          fullPage: parsed.data.fullPage ?? true,
          hasLocate: !!parsed.data.locate,
        },
      },
    });
  } catch (error) {
    console.error('网页总结失败:', error);
    return c.json(
      {
        ok: false,
        error: '网页总结失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export { summarizeRouter };
