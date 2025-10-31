import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import { WebSocketAction } from '../../utils/enums';
import { createErrorResponse, createSuccessResponse } from '../builders/messageBuilder';
import { summarizeWebPage } from '../../services/summarizeService';

export function createSummarizeHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info({ connectionId, messageId: meta.messageId }, '处理 summarize 网页请求');

    try {
      const { url, deviceScaleFactor, segmentHeight, type, quality } = payload.params || {};
      if (!url) {
        const response = createErrorResponse(
          message as WebSocketMessage,
          new Error('缺少 url 参数'),
          '参数错误',
        );
        send(response);
        return;
      }

      const { summary, imageSize } = await summarizeWebPage({ url, deviceScaleFactor, segmentHeight, type, quality });
      const response = createSuccessResponse(
        message as WebSocketMessage,
        { summary, imageSize },
        WebSocketAction.SUMMARIZE as any,
      );
      send(response);
    } catch (error) {
      wsLogger.error({ connectionId, error, messageId: meta.messageId }, 'summarize 失败');
      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        'summarize 失败',
      );
      send(response);
    }
  };
}


