import { afterEach, describe, expect, it } from 'vitest';
import {
  TaskLockKey,
  taskExecutionGuard,
} from '../taskExecutionGuard';
import type { WebSocketMessage } from '../../../types/websocket';

function createMessage(
  messageId: string,
  action = 'ai.execute',
): WebSocketMessage {
  return {
    meta: {
      messageId,
      conversationId: 'conv-1',
      timestamp: Date.now(),
      clientType: 'web',
    },
    payload: {
      action,
      params: '',
      site: 'site',
      originalCmd: 'cmd',
    },
  };
}

afterEach(() => {
  for (const key of Object.values(TaskLockKey)) {
    const current = taskExecutionGuard.getCurrentLock(key);
    if (current) {
      taskExecutionGuard.release(key, current.messageId);
    }
  }
});

describe('taskExecutionGuard', () => {
  it('在同一 key 上只允许一个任务获取锁', () => {
    const firstMessage = createMessage('msg-1', 'action-1');
    const secondMessage = createMessage('msg-2', 'action-2');

    const firstAcquire = taskExecutionGuard.tryAcquire(
      TaskLockKey.WEB,
      firstMessage,
    );
    expect(firstAcquire.acquired).toBe(true);

    const secondAcquire = taskExecutionGuard.tryAcquire(
      TaskLockKey.WEB,
      secondMessage,
    );
    expect(secondAcquire.acquired).toBe(false);
    expect(secondAcquire.current?.messageId).toBe('msg-1');
    expect(secondAcquire.current?.action).toBe('action-1');
  });

  it('释放正确的 messageId 后应该允许新任务获取锁', () => {
    const firstMessage = createMessage('msg-3', 'action-3');
    const nextMessage = createMessage('msg-4', 'action-4');

    const firstAcquire = taskExecutionGuard.tryAcquire(
      TaskLockKey.WINDOWS,
      firstMessage,
    );
    expect(firstAcquire.acquired).toBe(true);

    taskExecutionGuard.release(TaskLockKey.WINDOWS, firstMessage.meta.messageId);

    const secondAcquire = taskExecutionGuard.tryAcquire(
      TaskLockKey.WINDOWS,
      nextMessage,
    );
    expect(secondAcquire.acquired).toBe(true);
  });

  it('使用错误的 messageId 释放不会清除现有锁', () => {
    const message = createMessage('msg-5', 'action-5');
    const another = createMessage('msg-6', 'action-6');

    const acquire = taskExecutionGuard.tryAcquire(TaskLockKey.WEB, message);
    expect(acquire.acquired).toBe(true);

    taskExecutionGuard.release(TaskLockKey.WEB, 'invalid-id');

    const retry = taskExecutionGuard.tryAcquire(TaskLockKey.WEB, another);
    expect(retry.acquired).toBe(false);
    expect(retry.current?.messageId).toBe(message.meta.messageId);

    // 终止锁，避免影响其他用例
    taskExecutionGuard.release(TaskLockKey.WEB, message.meta.messageId);
  });
});

