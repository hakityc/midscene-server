import type { MessageHandler, WebSocketMessage } from '../../../types/websocket';
import { WebSocketAction } from '../../../utils/enums';
import { wsLogger } from '../../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../../builders/messageBuilder';

/**
 * Windows 端 AI 请求处理器
 * 用于处理 Windows 客户端的 AI 操作
 */
export function createWindowsAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'windows_ai_request',
        clientType: 'windows',
      },
      '处理 Windows AI 请求',
    );

    try {
      const params = payload.params;

      // TODO: 实现 Windows 特定的 AI 处理逻辑
      // 这里应该调用 Windows 特定的操作服务
      // const windowsOperateService = WindowsOperateService.getInstance();
      
      // 临时实现：记录请求并返回成功响应
      wsLogger.info(
        {
          connectionId,
          messageId: meta.messageId,
          params,
        },
        'Windows AI 处理（待实现）',
      );

      // 发送任务进度回调（示例）
      const progressResponse = createSuccessResponseWithMeta(
        message as WebSocketMessage,
        {
          stage: 'processing',
          tip: '正在处理 Windows AI 请求...',
        },
        WebSocketAction.CALLBACK_AI_STEP,
      );
      send(progressResponse);

      // 模拟处理
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 返回成功响应
      const response = createSuccessResponse(
        message as WebSocketMessage,
        `Windows AI 处理完成`,
        WebSocketAction.AI,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'Windows AI 处理失败',
      );
      
      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        'Windows AI 处理失败',
      );
      send(response);
    }
  };
}

