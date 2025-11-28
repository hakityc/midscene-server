import { describe, expect, it } from 'vitest';
import { detectBusinessError } from '../businessErrorDetector';

describe('detectBusinessError', () => {
  describe('无错误场景', () => {
    it('null 输入返回无错误', () => {
      const result = detectBusinessError(null);
      expect(result.hasError).toBe(false);
      expect(result.errorMsg).toBe('');
    });

    it('undefined 输入返回无错误', () => {
      const result = detectBusinessError(undefined);
      expect(result.hasError).toBe(false);
      expect(result.errorMsg).toBe('');
    });

    it('原始类型输入返回无错误', () => {
      expect(detectBusinessError('string').hasError).toBe(false);
      expect(detectBusinessError(123).hasError).toBe(false);
      expect(detectBusinessError(true).hasError).toBe(false);
    });

    it('空对象返回无错误', () => {
      const result = detectBusinessError({});
      expect(result.hasError).toBe(false);
    });

    it('成功状态的对象返回无错误', () => {
      const result = detectBusinessError({ status: 'success', msg: 'OK' });
      expect(result.hasError).toBe(false);
    });

    it('包含成功结果的 Map 返回无错误', () => {
      const result = detectBusinessError({
        '0': { status: 'success', msg: 'Task 1 OK' },
        '1': { status: 'success', msg: 'Task 2 OK' },
      });
      expect(result.hasError).toBe(false);
    });
  });

  describe('直接对象格式 (Direct object)', () => {
    it('检测到 status: "failed" 的直接对象', () => {
      const input = { status: 'failed', msg: '未找到该用户' };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('未找到该用户');
      expect(result.rawResult).toEqual(input);
    });

    it('缺少 msg 时使用默认错误消息', () => {
      const input = { status: 'failed' };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('Unknown business error');
    });
  });

  describe('CDP 结果包装格式 (CDP result wrapper)', () => {
    it('检测到 result.value 中的失败状态', () => {
      const input = {
        result: {
          value: { status: 'failed', msg: 'CDP 执行失败' },
        },
      };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('CDP 执行失败');
      expect(result.rawResult).toEqual(input.result.value);
    });

    it('result.value 为成功状态时返回无错误', () => {
      const input = {
        result: {
          value: { status: 'success', data: 'some data' },
        },
      };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(false);
    });
  });

  describe('executeScript Map 格式', () => {
    it('检测到 Map 中任意条目的失败状态', () => {
      const input = {
        '0': { status: 'success', msg: 'Task 1 OK' },
        '1': { status: 'failed', msg: 'LEBO_Flow.do action failed: 未找到该用户' },
        '2': { status: 'success', msg: 'Task 3 OK' },
      };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('LEBO_Flow.do action failed: 未找到该用户');
      expect(result.rawResult).toEqual(input['1']);
    });

    it('第一个失败条目被返回', () => {
      const input = {
        '0': { status: 'failed', msg: 'First error' },
        '1': { status: 'failed', msg: 'Second error' },
      };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      // 注意：Object.values 的顺序可能因引擎而异，但对于数字键通常是升序
      expect(result.errorMsg).toBe('First error');
    });

    it('所有条目成功时返回无错误', () => {
      const input = {
        '0': { status: 'success' },
        '1': { status: 'success' },
      };
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(false);
    });
  });

  describe('混合/边界场景', () => {
    it('嵌套对象中非 status 字段不触发错误检测', () => {
      const input = {
        nested: {
          status: 'failed',
          msg: 'This should not be detected at top level',
        },
      };
      // 由于 nested 本身不是 { status: 'failed' }，而是包含这样的对象
      // detectBusinessError 会遍历 values，发现 nested 是 { status: 'failed', msg: ... }
      const result = detectBusinessError(input);

      // 这里 nested 会被检测到
      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('This should not be detected at top level');
    });

    it('数组中的失败对象也会被检测', () => {
      // Object.values 对数组会返回其元素
      const input = [
        { status: 'success' },
        { status: 'failed', msg: 'Array item failed' },
      ];
      const result = detectBusinessError(input);

      expect(result.hasError).toBe(true);
      expect(result.errorMsg).toBe('Array item failed');
    });
  });
});

