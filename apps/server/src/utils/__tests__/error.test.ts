import type { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, setupError } from '../error';

// Mock serverLogger 和 logErrorWithCategory
vi.mock('../logger', () => ({
  serverLogger: {
    error: vi.fn(),
  },
  logErrorWithCategory: vi.fn(),
}));

describe('AppError', () => {
  it('应该创建一个基本的 AppError 实例', () => {
    const message = '测试错误';
    const error = new AppError(message);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
  });

  it('应该创建带自定义状态码的 AppError', () => {
    const message = '未授权';
    const statusCode = 401;
    const error = new AppError(message, statusCode);

    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
    expect(error.isOperational).toBe(true);
  });

  it('应该创建非操作性错误', () => {
    const message = '系统错误';
    const statusCode = 500;
    const isOperational = false;
    const error = new AppError(message, statusCode, isOperational);

    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
    expect(error.isOperational).toBe(false);
  });

  it('应该支持各种 HTTP 状态码', () => {
    const testCases = [
      { message: '错误请求', statusCode: 400 },
      { message: '未授权', statusCode: 401 },
      { message: '禁止访问', statusCode: 403 },
      { message: '未找到', statusCode: 404 },
      { message: '服务器错误', statusCode: 500 },
      { message: '网关错误', statusCode: 502 },
    ];

    testCases.forEach(({ message, statusCode }) => {
      const error = new AppError(message, statusCode);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });
  });

  it('应该保持原型链', () => {
    const error = new AppError('测试错误');
    expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
  });
});

describe('setupError', () => {
  let mockApp: Hono;
  let mockContext: any;
  let errorHandler: (err: Error, c: any) => any;

  beforeEach(() => {
    mockContext = {
      json: vi.fn((data: any, status?: any) => ({ json: data, status })),
      req: {
        path: '/test/path',
        method: 'GET',
      },
    };

    mockApp = {
      onError: vi.fn((handler) => {
        errorHandler = handler;
      }),
    } as unknown as Hono;

    vi.clearAllMocks();
  });

  it('应该注册错误处理器', () => {
    setupError(mockApp);
    expect(mockApp.onError).toHaveBeenCalledTimes(1);
  });

  it('应该处理 AppError 实例', () => {
    setupError(mockApp);
    const appError = new AppError('自定义错误', 400);

    errorHandler(appError, mockContext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        success: false,
        error: '自定义错误',
      },
      400,
    );
  });

  it('应该处理通用 Error', () => {
    setupError(mockApp);
    const genericError = new Error('通用错误');

    errorHandler(genericError, mockContext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Internal Server Error',
      },
      500,
    );
  });

  it('应该处理 TypeError', () => {
    setupError(mockApp);
    const typeError = new TypeError('类型错误');

    errorHandler(typeError, mockContext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Type Error',
        message: '类型错误',
      },
      400,
    );
  });

  it('应该在开发环境中包含堆栈信息', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    setupError(mockApp);
    const appError = new AppError('开发环境错误', 500);

    errorHandler(appError, mockContext);

    const callArgs = mockContext.json.mock.calls[0];
    expect(callArgs[0]).toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  it('应该在生产环境中隐藏堆栈信息', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    setupError(mockApp);
    const appError = new AppError('生产环境错误', 500);

    errorHandler(appError, mockContext);

    const callArgs = mockContext.json.mock.calls[0];
    expect(callArgs[0]).not.toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  it('应该处理 ZodError', () => {
    setupError(mockApp);
    const zodError = new Error('验证失败');
    zodError.name = 'ZodError';

    errorHandler(zodError, mockContext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Validation Error',
        message: '验证失败',
      },
      400,
    );
  });

  it('应该处理不同状态码的 AppError', () => {
    setupError(mockApp);

    const testCases = [
      { error: new AppError('错误请求', 400), expectedStatus: 400 },
      { error: new AppError('未授权', 401), expectedStatus: 401 },
      { error: new AppError('禁止访问', 403), expectedStatus: 403 },
      { error: new AppError('未找到', 404), expectedStatus: 404 },
      { error: new AppError('服务器错误', 500), expectedStatus: 500 },
    ];

    testCases.forEach(({ error, expectedStatus }) => {
      vi.clearAllMocks();
      errorHandler(error, mockContext);
      expect(mockContext.json.mock.calls[0][1]).toBe(expectedStatus);
    });
  });
});
