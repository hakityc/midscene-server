import { OperateService } from '../../services/operateService';
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';


const operateService = OperateService.getInstance();
operateService.on('taskStartTip', (tip: string) => {
  console.log(`监听到任务提示: ${tip}`)
  // 在这里可以添加自定义的处理逻辑
})

// AI 请求处理器
export function createAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'ai_request',
      },
      '处理 AI 请求',
    );

    try {
      const params = payload.params;
      await operateService.execute(params);
      const response = createSuccessResponse(
        message as WebSocketMessage,
        `AI 处理完成`,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'AI 处理失败',
      );
      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        'AI 处理失败',
      );
      send(response);
    }
  };
}
