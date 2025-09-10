import type { Context, Next } from 'hono';
import { createLogger } from '../utils/logger';

const logger = createLogger('middleware');

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // 记录请求开始
  logger.info({
    method,
    url,
    userAgent,
    ip,
    type: 'request_start'
  }, '开始处理请求');

  await next();

  const end = Date.now();
  const duration = end - start;
  const status = c.res.status;

  // 记录请求完成
  logger.info({
    method,
    url,
    status,
    duration,
    userAgent,
    ip,
    type: 'request_complete'
  }, '请求处理完成');
};
