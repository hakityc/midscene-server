import type {
  WebSocketMessage,
  WsInboundMessage,
  WsOutboundMessage,
} from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { formatUserError } from '../../utils/errorFormatter';

/**
 * 构建出站消息（服务端 -> 客户端）- 基于原始消息的 meta
 */
function buildOutboundFromMeta<R = unknown>(
  originalMeta: WsInboundMessage['meta'],
  action: WebSocketAction,
  status: 'success' | 'failed',
  data?: { result?: R; error?: string },
): WsOutboundMessage<R> {
  return {
    meta: {
      ...originalMeta,
      timestamp: Math.floor(Date.now() / 1000),
    },
    payload: {
      action,
      status,
      ...(status === 'success' ? { result: data?.result as R } : {}),
      ...(status === 'failed' ? { error: data?.error ?? 'UNKNOWN_ERROR' } : {}),
    },
  };
}

/**
 * 构建出站消息（服务端 -> 客户端）- 手动指定 meta 字段
 */
function buildOutbound<R = unknown>(
  messageId: string,
  conversationId: string,
  action: WebSocketAction,
  status: 'success' | 'failed',
  data?: { result?: R; error?: string },
): WsOutboundMessage<R> {
  return {
    meta: {
      messageId,
      conversationId,
      timestamp: Math.floor(Date.now() / 1000),
    },
    payload: {
      action,
      status,
      ...(status === 'success' ? { result: data?.result as R } : {}),
      ...(status === 'failed' ? { error: data?.error ?? 'UNKNOWN_ERROR' } : {}),
    },
  };
}

/**
 * 构建成功响应消息
 */
export function createSuccessResponse<R = string>(
  originalMessage: WsInboundMessage,
  result: R,
  action: WebSocketAction = WebSocketAction.CALLBACK,
): WsOutboundMessage<R> {
  return buildOutboundFromMeta<R>(originalMessage.meta, action, 'success', {
    result,
  });
}

/**
 * 构建包含额外元数据的成功响应消息
 */
export function createSuccessResponseWithMeta<
  R = string,
  M = Record<string, any>,
>(
  originalMessage: WsInboundMessage,
  result: R,
  metadata?: M,
  action: WebSocketAction = WebSocketAction.CALLBACK,
): WsOutboundMessage<{ data: R; meta?: M }> {
  return buildOutboundFromMeta<{ data: R; meta?: M }>(
    originalMessage.meta,
    action,
    'success',
    {
      result: { data: result, meta: metadata },
    },
  );
}

/**
 * 构建错误响应消息
 * 使用 errorFormatter 将技术性错误转换为用户友好的消息
 */
export function createErrorResponse(
  originalMessage: WsInboundMessage,
  _error: unknown,
  _prefix: string = '操作失败',
): WsOutboundMessage<string> {
  // 使用错误格式化工具生成用户友好的错误消息
  const formattedError = formatUserError(_error);

  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    // 使用原始消息的 action
    originalMessage.payload.action as any,
    'failed',
    {
      error: formattedError.userMessage,
    },
  );
}

/**
 * 构建系统消息
 */
export function createSystemMessage(
  messageId: string,
  body: string,
  action: WebSocketAction = WebSocketAction.CALLBACK,
): WsOutboundMessage<string> {
  return buildOutbound<string>(messageId, 'system', action, 'success', {
    result: body,
  });
}

/**
 * 构建广播消息
 */
export function createBroadcastMessage(
  message: string | object,
): WsOutboundMessage<string> {
  const body = typeof message === 'string' ? message : JSON.stringify(message);
  return buildOutbound<string>(
    `broadcast_${Date.now()}`,
    'broadcast',
    WebSocketAction.CALLBACK,
    'success',
    { result: body },
  );
}

/**
 * 构建欢迎消息
 */
export function createWelcomeMessage(
  connectionId: string,
): WsOutboundMessage<string> {
  const welcomeData = {
    connectionId,
    message: '连接已建立',
    serverTime: new Date().toISOString(),
  };

  return buildOutbound<string>(
    `welcome_${Date.now()}`,
    'system',
    WebSocketAction.CALLBACK,
    'success',
    { result: JSON.stringify(welcomeData) },
  );
}

/**
 * 构建未知动作响应消息
 */
export function createUnknownActionResponse(
  originalMessage: WebSocketMessage,
  action: string,
): WsOutboundMessage<string> {
  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    // 沿用传入的未知 action 字符串
    action as any,
    'failed',
    { error: `未知的 action 类型: ${action}` },
  );
}

/**
 * 构建解析错误响应消息
 */
export function createParseErrorResponse(
  error: unknown,
  _connectionId?: string,
): WsOutboundMessage<string> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return buildOutbound<string>(
    `parse_error_${Date.now()}`,
    'system',
    WebSocketAction.ERROR,
    'failed',
    { error: `消息解析失败: ${errorMessage}` },
  );
}

/**
 * 构建处理失败响应消息
 */
export function createProcessingErrorResponse(
  originalMessage: WebSocketMessage,
  error: unknown,
): WsOutboundMessage<string> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    // 使用原始消息的 action
    originalMessage.payload.action as any,
    'failed',
    { error: `消息处理失败: ${errorMessage}` },
  );
}

/**
 * 构指令消息
 */
export function createCommandMessage(
  originalMessage: WebSocketMessage,
  result: string,
): WsOutboundMessage<string> {
  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    WebSocketAction.COMMAND,
    'success',
    {
      result,
    },
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
  createCommandMessage,
};
