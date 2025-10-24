import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serviceLogger } from '../../utils/logger';

export const reportRouter = new Hono();

// 启用 CORS
reportRouter.use('*', cors());

/**
 * 获取最新的 report 文件路径
 */
reportRouter.get('/latest', (c) => {
  try {
    const reportDir = join(process.cwd(), 'midscene_run', 'report');
    const files = readdirSync(reportDir);

    // 过滤出 HTML 文件并获取最新的
    const htmlFiles = files
      .filter((file) => file.endsWith('.html'))
      .map((file) => {
        const filePath = join(reportDir, file);
        const stats = statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime.getTime(),
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (htmlFiles.length === 0) {
      return c.json({ error: '未找到 report 文件' }, 404);
    }

    const latestFile = htmlFiles[0];

    return c.json({
      fileName: latestFile.name,
      filePath: latestFile.path,
      timestamp: latestFile.mtime,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: '获取 report 文件失败' }, 500);
  }
});

/**
 * 获取指定的 report 文件内容
 */
reportRouter.get('/file/:filename', (c) => {
  try {
    const filename = c.req.param('filename');
    const reportDir = join(process.cwd(), 'midscene_run', 'report');
    const filePath = join(reportDir, filename);

    // 读取文件内容
    const content = readFileSync(filePath, 'utf-8');

    console.info('读取 report 文件', {
      filename,
      path: filePath,
    });

    // 返回 HTML 内容
    return c.html(content);
  } catch (error) {
    console.error(error);
    return c.json({ error: '读取 report 文件失败' }, 500);
  }
});

/**
 * 获取所有 report 文件列表
 */
reportRouter.get('/list', (c) => {
  try {
    const reportDir = join(process.cwd(), 'midscene_run', 'report');
    const files = readdirSync(reportDir);

    const htmlFiles = files
      .filter((file) => file.endsWith('.html'))
      .map((file) => {
        const filePath = join(reportDir, file);
        const stats = statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime.getTime(),
          size: stats.size,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return c.json({
      total: htmlFiles.length,
      files: htmlFiles,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: '获取 report 文件列表失败' }, 500);
  }
});
