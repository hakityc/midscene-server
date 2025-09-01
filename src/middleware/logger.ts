import { Context, Next } from 'hono';

export const logger = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - 开始处理请求`);
  
  await next();
  
  const end = Date.now();
  const duration = end - start;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - 完成处理 (${duration}ms)`);
};
