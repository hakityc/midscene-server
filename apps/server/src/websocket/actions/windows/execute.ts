import { WindowsOperateService } from '../../../services/windowsOperateService';
import type {
  MessageHandler,
  WebSocketMessage,
} from '../../../types/websocket';
import { WebSocketAction } from '../../../utils/enums';
import { wsLogger } from '../../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
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

    const windowsOperateService = WindowsOperateService.getInstance();

    try {
      const params = payload.params;

      // 执行 Windows AI 任务
      await windowsOperateService.execute(params);

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

      // 检查是否是连接错误
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('连接') || errorMessage.includes('connect')) {
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
          'Windows AI 处理失败',
        );
        send(response);
      }
    }
  };
}
