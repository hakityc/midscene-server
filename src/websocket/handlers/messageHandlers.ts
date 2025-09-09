import { OperateController } from '../../controllers/operateController';
import { WebSocketAction } from '../../utils/enums';
import type { ConnectCurrentTabOption } from '../../types/operate';
import { wsLogger } from '../../utils/logger';
import type { WebSocketMessage } from '../index';
import { MessageBuilder } from '../builders/messageBuilder';

type WebSocketClient = any;

// 消息处理器上下文
export interface MessageHandlerContext {
  connectionId: string;
  ws: WebSocketClient;
  send: (message: WebSocketMessage) => boolean;
}

// 消息处理器类型
export type MessageHandler = (
  ctx: MessageHandlerContext,
  message: WebSocketMessage
) => Promise<void>;

// 使用 MessageBuilder 创建响应消息
export const createSuccessResponse = MessageBuilder.createSuccessResponse;
export const createErrorResponse = MessageBuilder.createErrorResponse;

// 连接标签页处理器
export function createConnectTabHandler(operateController: OperateController): MessageHandler {
  return async ({ ws, send }, message) => {
    wsLogger.info({
      messageId: message.message_id,
      action: 'connect_tab',
    }, '处理连接标签页请求');

    try {
      const option: ConnectCurrentTabOption = { forceSameTabNavigation: true };
      if (message.content.body !== '') {
        const maybeIndex = Number(message.content.body);
        if (!Number.isNaN(maybeIndex)) option.tabIndex = maybeIndex;
      }
      
      await operateController.connectCurrentTab(option);
      wsLogger.info({ option }, '标签页连接成功');
      
      const response = createSuccessResponse(
        message,
        `标签页连接成功: ${message.content.body}`
      );
      send(response);
    } catch (error) {
      wsLogger.error({ error, messageId: message.message_id }, '标签页连接失败');
      const response = createErrorResponse(message, error, '标签页连接失败');
      send(response);
    }
  };
}

// AI 请求处理器
export function createAiHandler(operateController: OperateController): MessageHandler {
  return async ({ ws, connectionId, send }, message) => {
    wsLogger.info({ 
      connectionId, 
      messageId: message.message_id, 
      action: 'ai_request' 
    }, '处理 AI 请求');

    try {
      await operateController.execute(message.content.body);
      const response = createSuccessResponse(
        message,
        `AI 处理完成: ${message.content.body}`
      );
      send(response);
    } catch (error) {
      wsLogger.error({ 
        connectionId, 
        error, 
        messageId: message.message_id 
      }, 'AI 处理失败');
      const response = createErrorResponse(message, error, 'AI 处理失败');
      send(response);
    }
  };
}

// 创建所有消息处理器
export function createMessageHandlers(operateController: OperateController): Record<WebSocketAction, MessageHandler> {
  return {
    [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(operateController),
    [WebSocketAction.AI]: createAiHandler(operateController),
    [WebSocketAction.CALLBACK]: async () => {},
    [WebSocketAction.ERROR]: async () => {},
  } as Record<WebSocketAction, MessageHandler>;
}
