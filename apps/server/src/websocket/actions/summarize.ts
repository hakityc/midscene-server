import { summarizeWebPageWithMidscene } from '../../services/summarizeWithMidsceneService';
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

export function createSummarizeHandler(): MessageHandler<{
  fullPage?: boolean; // 是否全页截图，默认 true
  locate?: any; // 指定要总结的区域
}> {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      { connectionId, messageId: meta.messageId },
      '处理 summarize 网页请求（对当前打开的网页进行总结）',
    );

    try {
      const { fullPage, locate } = payload.params || {};

      // 使用新的服务（支持全页截图、元素区域截图、懒加载处理）
      // 直接对当前打开的网页进行处理，无需 url 参数
      const { summary, imageSize, locateRect } =
        await summarizeWebPageWithMidscene({
          fullPage,
          locate,
        });

      const response = createSuccessResponse(
        message,
        { summary, imageSize, locateRect },
        WebSocketAction.SUMMARIZE as any,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        { connectionId, error, messageId: meta.messageId },
        'summarize 失败',
      );
      const response = createErrorResponse(message, error, 'summarize 失败');
      send(response);
    }
  };
}
