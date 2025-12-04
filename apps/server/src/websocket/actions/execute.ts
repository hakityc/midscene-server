import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../builders/messageBuilder';
import { TaskLockKey, taskExecutionGuard } from '../utils/taskExecutionGuard';

// AI 请求处理器
export function createAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(message, '处理 AI 请求');

    const acquireResult = taskExecutionGuard.tryAcquire(
      TaskLockKey.WEB,
      message as WebSocketMessage,
    );
    if (!acquireResult.acquired) {
      const busyAction = acquireResult.current?.action || '进行中的任务';
      const response = createErrorResponse(
        message as WebSocketMessage,
        new Error(`当前有任务执行中（${busyAction}），请稍后再试`),
        '任务排队中',
      );
      send(response);
      return;
    }

    const webOperateService = WebOperateServiceRefactored.getInstance();

    // 使用封装好的方法创建任务提示回调
    const taskTipCallback = webOperateService.createTaskTipCallback({
      send,
      message: message as WebSocketMessage,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      WebSocketAction,
    });

    try {
      const params = payload.params;

      // 检查连接状态
      const isConnected = await webOperateService.checkAndReconnect();
      if (!isConnected) {
        const response = createErrorResponse(
          message as WebSocketMessage,
          new Error('Agent连接已断开，正在尝试重连中，请稍后重试'),
          'Agent连接断开',
        );
        send(response);
        return;
      }

      // 监听重连事件（仅记录日志，不通知前端）
      const onReconnected = () => {
        wsLogger.info(
          {
            connectionId,
            messageId: meta.messageId,
          },
          'Agent重连成功，可以继续操作',
        );
      };

      webOperateService.once('reconnected', onReconnected);

      // 注册任务提示回调
      webOperateService.onTaskTip(taskTipCallback);

      try {
        // 从 payload 中提取 context（如果存在）
        const context = payload?.context || '';

        await webOperateService.setAiContext(context);
        await webOperateService.execute(params);
        const response = createSuccessResponse(
          message as WebSocketMessage,
          `AI 处理完成`,
          WebSocketAction.AI,
        );
        send(response);
      } finally {
        // 清理回调，避免内存泄漏
        webOperateService.offTaskTip(taskTipCallback);
      }
    } catch (error) {
      // 清理回调，避免内存泄漏
      try {
        webOperateService.offTaskTip(taskTipCallback);
      } catch (cleanupError) {
        // 忽略清理错误
        console.warn('清理回调时出错:', cleanupError);
      }

      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'AI 处理失败',
      );
      // 检查是否是连接错误
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('连接') || errorMessage.includes('timeout')) {
        const response = createErrorResponse(
          message as WebSocketMessage,
          error,
          '连接错误，正在尝试重连',
        );
        send(response);
      } else {
        const response = createErrorResponse(
          message as WebSocketMessage,
          error,
          'AI 处理失败',
        );
        send(response);
      }
    } finally {
      taskExecutionGuard.release(TaskLockKey.WEB, meta.messageId);
    }
  };
}
