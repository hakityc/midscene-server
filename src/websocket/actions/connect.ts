import { OperateService } from '../../services/operateService';
import type { ConnectCurrentTabOption } from '../../types/operate';
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

// 连接标签页处理器
export function createConnectTabHandler(): MessageHandler {
  return async ({ send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      {
        messageId: meta.messageId,
        action: 'connect_tab',
      },
      '处理连接标签页请求',
    );

    try {
      const option: ConnectCurrentTabOption = { forceSameTabNavigation: true };
      const params = payload.params;
      if (params !== '') {
        const maybeIndex = Number(params);
        if (!Number.isNaN(maybeIndex)) option.tabIndex = maybeIndex;
      }

      const operateService = OperateService.getInstance();
      await operateService.connectCurrentTab(option);
      wsLogger.info({ option }, '标签页连接成功');

      const response = createSuccessResponse(
        message as WebSocketMessage,
        `标签页连接成功`,
      );
      send(response);
    } catch (error) {
      wsLogger.error({ error, messageId: meta.messageId }, '标签页连接失败');
      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        '标签页连接失败',
      );
      send(response);
    }
  };
}
