import { OperateService } from '../../services/operateService';
import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';
import { TaskService } from '../../services/taskService';

// AI 请求处理器
export function createAiHandler(): MessageHandler {
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
      const prompt = message.content.body;
      // const taskService = new TaskService();
      // const taskResponse = await taskService.execute(prompt);
      await operateService.execute(prompt);
      const response = createSuccessResponse(
        message,
        `AI 处理完成: ${prompt}`,
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
