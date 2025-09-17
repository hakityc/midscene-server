import { OperateService } from '../../services/operateService';
import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

// AI 请求处理器
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    wsLogger.info(
      {
        connectionId,
        messageId: message.message_id,
        action: 'ai_request',
      },
      '处理 AI 请求',
    );

    try {
      const operateService = OperateService.getInstance();
      await operateService.executeScript(message.content.body);
      const response = createSuccessResponse(
        message,
        `AI 处理完成: ${message.content.body}`,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: message.message_id,
        },
        'AI 处理失败',
      );
      const response = createErrorResponse(message, error, 'AI 处理失败');
      send(response);
    }
  };
}
