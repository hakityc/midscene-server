import os from 'node:os';
import path from 'node:path';
import type { Browser, HTTPRequest, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

export type CookieParam = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expires?: number;
};

export type ExportPdfOptions = {
  url: string;
  cookies?: CookieParam[];
  timeoutMs?: number;
  pageRanges?: string;
};

export type ExportScreenshotOptions = {
  url: string;
  cookies?: CookieParam[];
  timeoutMs?: number;
  fullPage?: boolean;
  deviceScaleFactor?: number;
  segmentHeight?: number; // 启用分段拼接时的每段高度（像素）
  type?: 'png' | 'jpeg';
  quality?: number; // 仅 jpeg 生效 0-100
};

function resolveDefaultUserDataDir(): string | undefined {
  const profileName = process.env.CHROME_PROFILE_NAME || 'Default';
  if (process.platform === 'darwin') {
    const home = os.homedir();
    return path.join(
      home,
      'Library',
      'Application Support',
      'Google',
      'Chrome',
      profileName,
    );
  }
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    return path.join(local, 'Google', 'Chrome', 'User Data', profileName);
  }
  // linux 常见路径（尽量不猜测，交由 env 覆盖），留空表示让 Chrome 自定
  return undefined;
}

async function tryConnectToExisting(): Promise<Browser | null> {
  const wsUrl = process.env.CHROME_REMOTE_DEBUGGING_URL;
  const port = process.env.CHROME_REMOTE_DEBUGGING_PORT;
  try {
    if (wsUrl) {
      return await puppeteer.connect({ browserWSEndpoint: wsUrl });
    }
    if (port) {
      const endpoint = `http://127.0.0.1:${port}`;
      return await puppeteer.connect({ browserURL: endpoint } as any);
    }
  } catch {
    // 忽略连接失败，回落到 launch
  }
  return null;
}

function resolveLaunchConfig() {
  const executablePath = process.env.CHROME_EXECUTABLE_PATH;
  const userDataDir =
    process.env.CHROME_USER_DATA_DIR || resolveDefaultUserDataDir();
  const headless: any = 'new';
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ];
  return { executablePath, userDataDir, headless, args };
}

async function preArrangePage(page: Page) {
  // 关闭常见浮层、取消粘性、注入打印优化样式
  await page.addStyleTag({
    content: `
      * { scroll-behavior: auto !important; }
      [role="dialog"], .modal, .mask, .toast { display: none !important; }
      header, [style*="position: sticky"], .sticky { position: static !important; }
      @media print {
        nav, header, footer, .side, .toolbar, .sidebar { display: none !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  // 触发懒加载（滚至底部再回到顶部）
  await page.evaluate(async () => {
    const el = document.scrollingElement || document.documentElement;
    const total = el.scrollHeight;
    const step = () => new Promise((r) => requestAnimationFrame(r));
    for (let y = 0; y < total; y += window.innerHeight * 0.9) {
      el.scrollTo({ top: y });
      await step();
      await new Promise((r) => setTimeout(r, 50));
    }
    el.scrollTo({ top: 0 });
  });

  // 等待字体与图片稳定
  await page.evaluate(async () => {
    try {
      await (document as any).fonts?.ready;
    } catch {}
    const imgs = Array.from(document.images);
    await Promise.allSettled(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve(true);
        return new Promise((res) => {
          img.onload = img.onerror = () => res(true);
        });
      }),
    );
  });
}

export async function exportPagePdf(
  options: ExportPdfOptions,
): Promise<Uint8Array> {
  const { url, cookies, timeoutMs = 60_000, pageRanges } = options;

  let browser: Browser | null = await tryConnectToExisting();
  const launched = !browser;
  if (!browser) {
    const cfg = resolveLaunchConfig();
    browser = await puppeteer.launch(cfg);
  }

  try {
    const page = await browser.newPage();

    if (cookies && cookies.length > 0) {
      // 注入 Cookie 应在导航前
      const urlForDomain = new URL(url);
      await page.setCookie(
        ...(cookies.map((c) => {
          const domain = c.domain || `.${urlForDomain.hostname}`;
          const pathVal = c.path || '/';
          return { ...c, domain, path: pathVal } as CookieParam;
        }) as any),
      );
    }

    // 关闭干扰性的请求（如跟踪像素），保守拦截
    await page.setRequestInterception(true);
    page.on('request', (req: HTTPRequest) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') return req.continue();
      return req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });

    await preArrangePage(page);

    const pdf = await page.pdf({
      printBackground: true,
      format: 'A4',
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      pageRanges,
    });

    await page.close();
    return new Uint8Array(pdf);
  } finally {
    // 仅在我们启动的情况下关闭，连接模式不打断用户浏览器
    if (browser && launched) {
      await browser.close().catch(() => {});
    }
  }
}

export async function exportPageScreenshot(
  options: ExportScreenshotOptions,
): Promise<Uint8Array> {
  const {
    url,
    cookies,
    timeoutMs = 60_000,
    fullPage = true,
    deviceScaleFactor = 2,
    segmentHeight,
    type = 'png',
    quality,
  } = options;

  let browser: Browser | null = await tryConnectToExisting();
  const launched = !browser;
  if (!browser) {
    const cfg = resolveLaunchConfig();
    browser = await puppeteer.launch(cfg);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor });

    if (cookies && cookies.length > 0) {
      const urlForDomain = new URL(url);
      await page.setCookie(
        ...(cookies.map((c) => {
          const domain = c.domain || `.${urlForDomain.hostname}`;
          const pathVal = c.path || '/';
          return { ...c, domain, path: pathVal } as CookieParam;
        }) as any),
      );
    }

    await page.setRequestInterception(true);
    page.on('request', (req: HTTPRequest) => req.continue());

    await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });
    await preArrangePage(page);

    // 直接整页截图
    if (!segmentHeight || !fullPage) {
      const buf = (await page.screenshot({
        fullPage,
        type,
        quality,
        captureBeyondViewport: true,
      })) as unknown as Uint8Array;
      await page.close();
      return buf;
    }

    // 分段截图并拼接（适合极长页面）
    const total = await page.evaluate(
      () =>
        (document.scrollingElement || document.documentElement).scrollHeight,
    );
    const viewport = await page.viewport();
    const height = viewport?.height || 800;
    const step = Math.max(segmentHeight, height);
    const segments: Buffer[] = [];

    let top = 0;
    while (top < total) {
      const clipHeight = Math.min(step, total - top);
      const buf = (await page.screenshot({
        type,
        quality,
        clip: {
          x: 0,
          y: top,
          width: viewport?.width || 1280,
          height: clipHeight,
        },
        captureBeyondViewport: true,
      })) as unknown as Uint8Array;
      segments.push(Buffer.from(buf));
      top += clipHeight;
    }

    // 使用 sharp 进行纵向拼接
    const sharp = (await import('sharp')).default;
    const images = await Promise.all(segments.map(async (b) => sharp(b)));
    const metas = await Promise.all(images.map((i) => i.metadata()));
    const width = metas[0]?.width || 1280;
    const totalHeight = metas.reduce((sum, m) => sum + (m.height || 0), 0);

    const composite: { input: Buffer; top: number; left: number }[] = [];
    let offsetTop = 0;
    for (let i = 0; i < images.length; i++) {
      const b = await images[i].toBuffer();
      composite.push({ input: b, top: offsetTop, left: 0 });
      offsetTop += metas[i]?.height || 0;
    }

    const canvas = sharp({
      create: {
        width,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });
    const merged = await canvas.composite(composite).png().toBuffer();
    await page.close();
    return new Uint8Array(merged);
  } finally {
    if (browser && launched) {
      await browser.close().catch(() => {});
    }
  }
}
