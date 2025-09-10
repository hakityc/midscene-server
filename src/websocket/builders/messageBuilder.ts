import { WebSocketAction } from '../../utils/enums';
import type { WebSocketMessage } from '../index';

/**
 * 构建基础消息
 */
function buildBaseMessage(
  messageId: string,
  conversationId: string,
  action: WebSocketAction,
  body: string,
): WebSocketMessage {
  return {
    message_id: messageId,
    conversation_id: conversationId,
    content: { action, body },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 构建成功响应消息
 */
export function createSuccessResponse(
  originalMessage: WebSocketMessage,
  body: string,
  action: WebSocketAction = WebSocketAction.CALLBACK,
): WebSocketMessage {
  return buildBaseMessage(
    originalMessage.message_id,
    originalMessage.conversation_id,
    action,
    body,
  );
}

/**
 * 构建错误响应消息
 */
export function createErrorResponse(
  originalMessage: WebSocketMessage,
  error: unknown,
  prefix: string = '操作失败',
): WebSocketMessage {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return buildBaseMessage(
    originalMessage.message_id,
    originalMessage.conversation_id,
    WebSocketAction.ERROR,
    `${prefix}: ${errorMessage}`,
  );
}

/**
 * 构建系统消息
 */
export function createSystemMessage(
  messageId: string,
  body: string,
  conversationId: string = 'system',
  action: WebSocketAction = WebSocketAction.CALLBACK,
): WebSocketMessage {
  return buildBaseMessage(messageId, conversationId, action, body);
}

/**
 * 构建广播消息
 */
export function createBroadcastMessage(
  message: string | object,
  conversationId: string = 'broadcast',
): WebSocketMessage {
  const body = typeof message === 'string' ? message : JSON.stringify(message);
  return buildBaseMessage(
    `broadcast_${Date.now()}`,
    conversationId,
    WebSocketAction.CALLBACK,
    body,
  );
}

/**
 * 构建欢迎消息
 */
export function createWelcomeMessage(connectionId: string): WebSocketMessage {
  const welcomeData = {
    connectionId,
    message: '连接已建立',
    serverTime: new Date().toISOString(),
  };

  return buildBaseMessage(
    `welcome_${Date.now()}`,
    'system',
    WebSocketAction.CALLBACK,
    JSON.stringify(welcomeData),
  );
}

/**
 * 构建未知动作响应消息
 */
export function createUnknownActionResponse(
  originalMessage: WebSocketMessage,
  action: string,
): WebSocketMessage {
  return buildBaseMessage(
    originalMessage.message_id,
    originalMessage.conversation_id,
    WebSocketAction.CALLBACK,
    `未知的 action 类型: ${action}`,
  );
}

/**
 * 构建解析错误响应消息
 */
export function createParseErrorResponse(
  error: unknown,
  _connectionId?: string,
): WebSocketMessage {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return buildBaseMessage(
    `parse_error_${Date.now()}`,
    'system',
    WebSocketAction.ERROR,
    `消息解析失败: ${errorMessage}`,
  );
}

/**
 * 构建处理失败响应消息
 */
export function createProcessingErrorResponse(
  originalMessage: WebSocketMessage,
  error: unknown,
): WebSocketMessage {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return buildBaseMessage(
    originalMessage.message_id || `error_${Date.now()}`,
    originalMessage.conversation_id || 'system',
    WebSocketAction.ERROR,
    `消息处理失败: ${errorMessage}`,
  );
}

export const MessageBuilder = {
  createSuccessResponse,
  createErrorResponse,
  createSystemMessage,
  createBroadcastMessage,
  createWelcomeMessage,
  createUnknownActionResponse,
  createParseErrorResponse,
  createProcessingErrorResponse,
};
