import { summarizeWebPage } from '../../services/summarizeService';
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

export function createSummarizeHandler(): MessageHandler<{
  url: string;
  deviceScaleFactor?: number;
  segmentHeight?: number;
  type?: 'png' | 'jpeg';
  quality?: number;
}> {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      { connectionId, messageId: meta.messageId },
      '处理 summarize 网页请求',
    );

    try {
      const { url, deviceScaleFactor, segmentHeight, type, quality } =
        payload.params || {};
      if (!url) {
        const response = createErrorResponse(
          message,
          new Error('缺少 url 参数'),
          '参数错误',
        );
        send(response);
        return;
      }

      const { summary, imageSize } = await summarizeWebPage({
        url,
        deviceScaleFactor,
        segmentHeight,
        type,
        quality,
      });
      const response = createSuccessResponse(
        message,
        { summary, imageSize },
        WebSocketAction.SUMMARIZE as any,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        { connectionId, error, messageId: meta.messageId },
        'summarize 失败',
      );
      const response = createErrorResponse(
        message,
        error,
        'summarize 失败',
      );
      send(response);
    }
  };
}
