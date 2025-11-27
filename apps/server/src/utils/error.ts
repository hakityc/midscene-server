import type { Context, Hono } from 'hono';
import { ErrorCategory } from './logFields';
import { logErrorWithCategory, serverLogger } from './logger';

// 自定义错误类型
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 错误响应接口
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  stack?: string;
}

export const setupError = (app: Hono) => {
  app.onError((err: Error, c: Context) => {
    // 根据错误类型确定分类
    let errorCategory = ErrorCategory.SYSTEM_INTERNAL;
    if (err.name === 'ZodError' || err.name === 'TypeError') {
      errorCategory = ErrorCategory.CLIENT_INPUT;
    } else if (err instanceof AppError && err.statusCode >= 500) {
      errorCategory = ErrorCategory.SYSTEM_INTERNAL;
    }

    // 记录错误日志（使用分类）
    logErrorWithCategory(serverLogger, err, errorCategory, {
      path: c.req.path,
      method: c.req.method,
    });

    // 默认错误响应
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
    };

    // 设置默认状态码
    let statusCode: any = 500;

    // 根据错误类型设置状态码和消息
    if (err instanceof AppError) {
      statusCode = err.statusCode;
      errorResponse.error = err.message;
      // 在开发环境中返回错误堆栈
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
      }
    } else if (err.name === 'ZodError') {
      // 处理 Zod 验证错误
      statusCode = 400;
      errorResponse.error = 'Validation Error';
      errorResponse.message = err.message;
    } else if (err.name === 'TypeError') {
      // 处理类型错误
      statusCode = 400;
      errorResponse.error = 'Type Error';
      errorResponse.message = err.message;
    }

    return c.json(errorResponse, statusCode);
  });
};
