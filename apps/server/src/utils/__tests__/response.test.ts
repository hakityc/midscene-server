import { describe, it, expect, vi } from 'vitest';
import { successResponse, errorResponse } from '../response';
import type { Context } from 'hono';

// 创建 mock Context 对象
const createMockContext = () => {
  const mockJson = vi.fn((data: any, status?: any) => ({
    json: data,
    status,
  }));

  return {
    json: mockJson,
  } as unknown as Context;
};

describe('response utils', () => {
  describe('successResponse', () => {
    it('应该返回成功响应结构（带数据）', () => {
      const mockContext = createMockContext();
      const testData = { id: 1, name: 'test' };
      const message = '操作成功';

      successResponse(mockContext, testData, message);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: testData,
          message,
        },
        200
      );
    });

    it('应该返回成功响应（无消息）', () => {
      const mockContext = createMockContext();
      const testData = { result: 'ok' };

      successResponse(mockContext, testData);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: testData,
          message: undefined,
        },
        200
      );
    });

    it('应该支持自定义状态码', () => {
      const mockContext = createMockContext();
      const testData = { created: true };
      const customStatus = 201;

      successResponse(mockContext, testData, '创建成功', customStatus);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: testData,
          message: '创建成功',
        },
        customStatus
      );
    });

    it('应该支持空数据', () => {
      const mockContext = createMockContext();

      successResponse(mockContext, null);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: null,
          message: undefined,
        },
        200
      );
    });

    it('应该支持数组数据', () => {
      const mockContext = createMockContext();
      const testData = [1, 2, 3];

      successResponse(mockContext, testData);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: true,
          data: testData,
          message: undefined,
        },
        200
      );
    });
  });

  describe('errorResponse', () => {
    it('应该返回错误响应结构', () => {
      const mockContext = createMockContext();
      const errorMessage = '操作失败';

      errorResponse(mockContext, errorMessage);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        400
      );
    });

    it('应该支持自定义错误状态码', () => {
      const mockContext = createMockContext();
      const errorMessage = '未授权';
      const customStatus = 401;

      errorResponse(mockContext, errorMessage, customStatus);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        customStatus
      );
    });

    it('应该处理 404 错误', () => {
      const mockContext = createMockContext();
      const errorMessage = '资源不存在';

      errorResponse(mockContext, errorMessage, 404);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        404
      );
    });

    it('应该处理 500 内部错误', () => {
      const mockContext = createMockContext();
      const errorMessage = '服务器内部错误';

      errorResponse(mockContext, errorMessage, 500);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        500
      );
    });

    it('应该处理空错误消息', () => {
      const mockContext = createMockContext();

      errorResponse(mockContext, '');

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: '',
        },
        400
      );
    });
  });
});

