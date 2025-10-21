import { WindowsOperateService } from '../../services/windowsOperateService';
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

/**
 * 连接窗口处理器
 */
export function createConnectWindowHandler(): MessageHandler {
  return async ({ send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      {
        messageId: meta.messageId,
        action: 'connect_window',
        params: payload.params,
      },
      '处理连接窗口请求',
    );

    try {
      const windowsOperateService = WindowsOperateService.getInstance();

      // 参数验证
      const params =
        (payload.params as { windowId?: number; windowTitle?: string }) || {};
      if (!params.windowId && !params.windowTitle) {
        throw new Error('必须提供 windowId 或 windowTitle 参数');
      }

      // 连接窗口
      const windowInfo = await windowsOperateService.connectWindow({
        windowId: params.windowId,
        windowTitle: params.windowTitle,
      });

      wsLogger.info(
        {
          windowId: windowInfo.id,
          windowTitle: windowInfo.title,
        },
        '窗口连接成功',
      );

      const response = createSuccessResponse(
        message,
        `已成功连接到窗口: "${windowInfo.title}" (ID: ${windowInfo.id})`,
        WebSocketAction.CONNECT_WINDOW,
      );
      send(response);
    } catch (error) {
      wsLogger.error({ error, messageId: meta.messageId }, '窗口连接失败');
      const response = createErrorResponse(message, error, '窗口连接失败');
      send(response);
    }
  };
}
