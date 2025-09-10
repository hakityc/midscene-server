import { wsLogger } from '../../utils/logger';
import type { WebSocketMessage } from '../index';
import { MessageBuilder } from '../builders/messageBuilder';

type WebSocketClient = any;

/**
 * WebSocket 错误处理工具类
 */
export class WebSocketErrorHandler {
  /**
   * 处理消息处理过程中的错误
   */
  static async handleMessageProcessingError(
    ws: WebSocketClient,
    message: WebSocketMessage,
    error: unknown,
    context: {
      connectionId: string;
      action?: string;
    }
  ): Promise<void> {
    const { connectionId, action } = context;
    
    wsLogger.error({
      connectionId,
      error,
      messageId: message.message_id,
      action,
    }, '消息处理失败');

    const errorResponse = MessageBuilder.createProcessingErrorResponse(message, error);
    WebSocketErrorHandler.sendMessage(ws, errorResponse);
  }

  /**
   * 处理消息解析错误
   */
  static handleParseError(
    ws: WebSocketClient,
    error: unknown,
    rawData: string,
    connectionId?: string
  ): void {
    wsLogger.error({
      connectionId,
      error,
      rawData: rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''),
    }, '消息解析失败');

    const errorResponse = MessageBuilder.createParseErrorResponse(error, connectionId);
    WebSocketErrorHandler.sendMessage(ws, errorResponse);
  }

  /**
   * 处理未知动作类型错误
   */
  static handleUnknownAction(
    ws: WebSocketClient,
    message: WebSocketMessage,
    action: string
  ): void {
    wsLogger.warn({ 
      action, 
      messageId: message.message_id 
    }, '未知的 action 类型');

    const response = MessageBuilder.createUnknownActionResponse(message, action);
    WebSocketErrorHandler.sendMessage(ws, response);
  }

  /**
   * 处理连接错误
   */
  static handleConnectionError(
    connectionId: string,
    error: unknown
  ): void {
    wsLogger.error({ connectionId, error }, 'WebSocket 连接错误');
  }

  /**
   * 安全发送消息
   */
  private static sendMessage(ws: WebSocketClient, message: WebSocketMessage): boolean {
    try {
      if (ws && typeof ws.send === 'function') {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      wsLogger.error({ error }, '发送消息失败');
      return false;
    }
  }
}

/**
 * 通用错误处理装饰器
 * 用于包装消息处理器，自动处理错误
 */
export function withErrorHandling<T extends any[]>(
  handler: (ws: WebSocketClient, message: WebSocketMessage, ...args: T) => Promise<void>,
  errorContext: {
    connectionId: string;
    action?: string;
  }
) {
  return async (ws: WebSocketClient, message: WebSocketMessage, ...args: T): Promise<void> => {
    try {
      await handler(ws, message, ...args);
    } catch (error) {
      await WebSocketErrorHandler.handleMessageProcessingError(
        ws,
        message,
        error,
        errorContext
      );
    }
  };
}
