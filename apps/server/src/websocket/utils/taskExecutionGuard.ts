import type { WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';

/**
 * 任务执行锁的键类型
 * 目前主要区分 web 与 windows 操作服务
 */
export enum TaskLockKey {
  WEB = 'web',
  WINDOWS = 'windows',
}

interface TaskLockInfo {
  messageId: string;
  action: string;
  startedAt: number;
}

interface AcquireResult {
  acquired: boolean;
  current?: TaskLockInfo;
}

/**
 * 简单的任务执行互斥管理器
 * - 同一 key 在同一时间只允许一个任务执行
 * - 通过 messageId 防止误释放
 */
class TaskExecutionGuard {
  private locks = new Map<string, TaskLockInfo>();

  /**
   * 尝试获取任务执行锁
   */
  tryAcquire(
    key: TaskLockKey | string,
    message: WebSocketMessage,
  ): AcquireResult {
    const current = this.locks.get(key);
    if (current) {
      return { acquired: false, current };
    }

    const lockInfo: TaskLockInfo = {
      messageId: message.meta.messageId,
      action: String(message.payload?.action ?? 'unknown'),
      startedAt: Date.now(),
    };

    this.locks.set(key, lockInfo);
    wsLogger.info(
      {
        key,
        messageId: lockInfo.messageId,
        action: lockInfo.action,
      },
      '任务执行锁已获取',
    );
    return { acquired: true };
  }

  /**
   * 释放任务执行锁
   */
  release(key: TaskLockKey | string, messageId: string): void {
    const current = this.locks.get(key);
    if (!current) {
      return;
    }

    if (current.messageId !== messageId) {
      wsLogger.warn(
        {
          key,
          expectedMessageId: current.messageId,
          actualMessageId: messageId,
        },
        '任务执行锁释放被忽略：messageId 不匹配',
      );
      return;
    }

    this.locks.delete(key);
    wsLogger.info(
      {
        key,
        messageId,
        duration: Date.now() - current.startedAt,
      },
      '任务执行锁已释放',
    );
  }

  /**
   * 获取当前锁信息，方便外部用于提示
   */
  getCurrentLock(key: TaskLockKey | string): TaskLockInfo | null {
    return this.locks.get(key) ?? null;
  }
}

export const taskExecutionGuard = new TaskExecutionGuard();

