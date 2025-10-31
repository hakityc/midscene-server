import { Hono } from 'hono';
import { z } from 'zod';
import {
  exportPagePdf,
  exportPageScreenshot,
} from '../../services/puppeteerPdfService';

export const exportRouter = new Hono();

const ExportBodySchema = z.object({
  url: z.string().url(),
  cookies: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        path: z.string().optional(),
        secure: z.boolean().optional(),
        httpOnly: z.boolean().optional(),
        sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
        expires: z.number().optional(),
      }),
    )
    .optional(),
  pageRanges: z.string().optional(),
  sendToAgent: z.boolean().optional(),
});

exportRouter.post('/pdf', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ExportBodySchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { url, cookies, pageRanges, sendToAgent } = parsed.data;

  const pdf = await exportPagePdf({ url, cookies, pageRanges });

  if (sendToAgent) {
    // 预留：后续集成现有 Agent 发送通道（单独待办）
    return c.json({ ok: true, size: pdf.length });
  }

  const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
  return c.newResponse(new Uint8Array(ab as ArrayBuffer), 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="export.pdf"',
  });
});

const ScreenshotBodySchema = z.object({
  url: z.string().url(),
  cookies: ExportBodySchema.shape.cookies.optional(),
  fullPage: z.boolean().optional(),
  deviceScaleFactor: z.number().min(1).max(4).optional(),
  segmentHeight: z.number().min(500).max(20000).optional(),
  type: z.enum(['png', 'jpeg']).optional(),
  quality: z.number().min(0).max(100).optional(),
});

exportRouter.post('/screenshot', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ScreenshotBodySchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const buf = await exportPageScreenshot(parsed.data);
  const type = parsed.data.type || 'png';
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return c.newResponse(new Uint8Array(ab as ArrayBuffer), 200, {
    'Content-Type': type === 'png' ? 'image/png' : 'image/jpeg',
    'Content-Disposition': `inline; filename="screenshot.${type}"`,
  });
});
