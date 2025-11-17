/**
 * BaseOperateService 测试用例
 *
 * 验证基类的核心功能是否正常工作
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BaseOperateService,
  OperateServiceState,
  type TaskTipCallback,
} from '../BaseOperateService';

// 创建一个测试用的具体实现类
class TestOperateService extends BaseOperateService<any> {
  public createAgentCalled = false;
  public initializeConnectionCalled = false;

  protected async createAgent(): Promise<void> {
    this.createAgentCalled = true;
    this.agent = { test: true } as any;
  }

  protected async initializeConnection(): Promise<void> {
    this.initializeConnectionCalled = true;
  }

  protected getServiceName(): string {
    return 'TestService';
  }

  async execute(prompt: string): Promise<void> {
    console.log('Executing:', prompt);
  }

  async expect(prompt: string): Promise<void> {
    console.log('Expecting:', prompt);
  }

  async executeScript(script: string): Promise<any> {
    console.log('Executing script:', script);
    return { success: true };
  }
}

describe('BaseOperateService', () => {
  let service: TestOperateService;

  beforeEach(() => {
    service = new TestOperateService();
  });

  describe('状态管理', () => {
    it('应该初始化为 STOPPED 状态', () => {
      expect(service.getState()).toBe(OperateServiceState.STOPPED);
    });

    it('start() 应该将状态改为 RUNNING', async () => {
      await service.start();
      expect(service.getState()).toBe(OperateServiceState.RUNNING);
      expect(service.createAgentCalled).toBe(true);
      expect(service.initializeConnectionCalled).toBe(true);
    });

    it('stop() 应该将状态改为 STOPPED', async () => {
      await service.start();
      await service.stop();
      expect(service.getState()).toBe(OperateServiceState.STOPPED);
    });

    it('重复调用 start() 应该跳过', async () => {
      await service.start();
      service.createAgentCalled = false;
      service.initializeConnectionCalled = false;

      await service.start();
      expect(service.createAgentCalled).toBe(false);
      expect(service.initializeConnectionCalled).toBe(false);
    });
  });

  describe('生命周期方法', () => {
    it('isStarted() 应该正确反映服务状态', async () => {
      expect(service.isStarted()).toBe(false);
      await service.start();
      expect(service.isStarted()).toBe(true);
      await service.stop();
      expect(service.isStarted()).toBe(false);
    });

    it('isReady() 应该与 isStarted() 返回相同值', async () => {
      expect(service.isReady()).toBe(service.isStarted());
      await service.start();
      expect(service.isReady()).toBe(service.isStarted());
    });

    it('destroy() 应该调用 stop()', async () => {
      await service.start();
      const stopSpy = vi.spyOn(service, 'stop');
      await service.destroy();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('回调机制', () => {
    it('应该能够注册和触发任务提示回调', async () => {
      let callbackCalled = false;
      let receivedTip = '';
      let receivedStepIndex: number | undefined;

      const callback: TaskTipCallback = (tip, _bridgeError, stepIndex) => {
        callbackCalled = true;
        receivedTip = tip;
        receivedStepIndex = stepIndex;
      };

      service.onTaskTip(callback);

      // 触发回调
      (service as any).triggerTaskTipCallbacks('test tip', undefined, 5);

      expect(callbackCalled).toBe(true);
      expect(receivedTip).toBe('test tip');
      expect(receivedStepIndex).toBe(5);
    });

    it('应该能够移除任务提示回调', async () => {
      let callbackCalled = false;

      const callback: TaskTipCallback = () => {
        callbackCalled = true;
      };

      service.onTaskTip(callback);
      service.offTaskTip(callback);

      // 触发回调
      (service as any).triggerTaskTipCallbacks('test tip');

      expect(callbackCalled).toBe(false);
    });

    it('应该能够清空所有回调', () => {
      const noop: TaskTipCallback = () => {};
      const callback1: TaskTipCallback = noop;
      const callback2: TaskTipCallback = noop;

      service.onTaskTip(callback1);
      service.onTaskTip(callback2);

      expect((service as any).taskTipCallbacks.length).toBe(2);

      service.clearTaskTipCallbacks();

      expect((service as any).taskTipCallbacks.length).toBe(0);
    });

    it('未显式传入 stepIndex 时应该自动生成递增索引', () => {
      const receivedStepIndexes: number[] = [];
      const callback: TaskTipCallback = (_tip, _error, stepIndex) => {
        receivedStepIndexes.push(stepIndex);
      };

      service.onTaskTip(callback);

      (service as any).triggerTaskTipCallbacks('auto step 1');
      (service as any).triggerTaskTipCallbacks('auto step 2');

      expect(receivedStepIndexes).toEqual([0, 1]);
    });

    it('beforeOperate 应该在每个任务开始前重置自动 stepIndex', async () => {
      const receivedStepIndexes: number[] = [];
      const callback: TaskTipCallback = (_tip, _error, stepIndex) => {
        receivedStepIndexes.push(stepIndex);
      };

      service.onTaskTip(callback);

      (service as any).triggerTaskTipCallbacks('task-1-step-1');
      (service as any).triggerTaskTipCallbacks('task-1-step-2');

      const resetDump = vi.fn();
      (service as any).agent = { resetDump } as any;

      await (service as any).beforeOperate('mock-task');

      (service as any).triggerTaskTipCallbacks('task-2-step-1');

      expect(resetDump).toHaveBeenCalled();
      expect(receivedStepIndexes).toEqual([0, 1, 0]);
    });
  });

  describe('错误跟踪', () => {
    it('应该能够记录任务错误', () => {
      const error = new Error('Test error');
      (service as any).taskErrors.push({
        taskName: 'test task',
        error,
        timestamp: Date.now(),
      });

      const errors = service.getTaskErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].taskName).toBe('test task');
      expect(errors[0].error).toBe(error);
    });

    it('应该能够清空错误记录', () => {
      (service as any).taskErrors.push({
        taskName: 'test task',
        error: new Error('Test error'),
        timestamp: Date.now(),
      });

      expect(service.getTaskErrors()).toHaveLength(1);

      service.clearTaskErrors();

      expect(service.getTaskErrors()).toHaveLength(0);
    });
  });

  describe('createTaskTipCallback', () => {
    it('应该创建有效的回调函数', () => {
      const mockSend = vi.fn();
      const mockMessage = { meta: {}, payload: {} };
      const mockWsLogger = { warn: vi.fn(), info: vi.fn() };
      const mockCreateSuccess = vi.fn();
      const mockCreateError = vi.fn();
      const mockWebSocketAction = { CALLBACK_AI_STEP: 'callback_ai_step' };

      const callback = service.createTaskTipCallback({
        send: mockSend,
        message: mockMessage,
        connectionId: 'test-id',
        wsLogger: mockWsLogger,
        createSuccessResponseWithMeta: mockCreateSuccess,
        createErrorResponse: mockCreateError,
        WebSocketAction: mockWebSocketAction,
      });

      expect(typeof callback).toBe('function');
    });
  });
});
