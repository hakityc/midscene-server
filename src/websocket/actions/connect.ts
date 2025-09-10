import { OperateService } from '../../services/operateService';
import type { ConnectCurrentTabOption } from '../../types/operate';
import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

// 连接标签页处理器
export function createConnectTabHandler(): MessageHandler {
  return async ({ send }, message) => {
    wsLogger.info(
      {
        messageId: message.message_id,
        action: 'connect_tab',
      },
      '处理连接标签页请求',
    );

    try {
      const option: ConnectCurrentTabOption = { forceSameTabNavigation: true };
      if (message.content.body !== '') {
        const maybeIndex = Number(message.content.body);
        if (!Number.isNaN(maybeIndex)) option.tabIndex = maybeIndex;
      }

      const operateService = OperateService.getInstance();
      await operateService.connectCurrentTab(option);
      wsLogger.info({ option }, '标签页连接成功');

      const response = createSuccessResponse(
        message,
        `标签页连接成功: ${message.content.body}`,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        { error, messageId: message.message_id },
        '标签页连接失败',
      );
      const response = createErrorResponse(message, error, '标签页连接失败');
      send(response);
    }
  };
}
