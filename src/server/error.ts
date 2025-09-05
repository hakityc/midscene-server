import { Hono } from 'hono';
import { Context } from 'hono';

export const setupError = (app: Hono) => {
  // 全局错误处理
  app.onError((err: Error, c: Context) => {
    console.error('🚨 全局错误:', {
      message: err.message,
      stack: err.stack,
      url: c.req.url,
      method: c.req.method,
      timestamp: new Date().toISOString()
    });

    // 根据错误类型返回不同的响应
    if (err.message.includes('EADDRINUSE')) {
      return c.json({ 
        error: '端口被占用', 
        message: '服务端口已被其他进程使用，请检查并关闭冲突的进程',
        code: 'PORT_IN_USE'
      }, 503);
    }

    if (err.message.includes('Bridge Listening Error')) {
      return c.json({ 
        error: 'Bridge 连接失败', 
        message: '浏览器桥接服务启动失败，请检查端口是否被占用',
        code: 'BRIDGE_ERROR'
      }, 503);
    }

    if (err.message.includes('timeout')) {
      return c.json({ 
        error: '请求超时', 
        message: '操作执行超时，请稍后重试',
        code: 'TIMEOUT'
      }, 408);
    }

    // 默认错误响应
    return c.json({ 
      error: 'Internal Server Error',
      message: '服务器内部错误，请稍后重试',
      code: 'INTERNAL_ERROR'
    }, 500);
  });

  // 未捕获的异常处理
  process.on('uncaughtException', (error) => {
    console.error('🚨 未捕获的异常:', error);
    // 不要立即退出进程，让应用继续运行
  });

  // 未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 未处理的 Promise 拒绝:', {
      reason,
      promise,
      timestamp: new Date().toISOString()
    });
  });
};