import type {
  WebSocketMessage,
  WsInboundMessage,
  WsOutboundMessage,
} from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { AppError } from '../../utils/error';

const INTERNAL_BUSINESS_ERROR_MESSAGE = 'midscene-server内部错误';

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
 * 在开发环境下会包含更详细的错误信息（如 stack trace）
 */
export function createErrorResponse(
  originalMessage: WsInboundMessage,
  _error: unknown,
  prefix: string = '操作失败',
): WsOutboundMessage<string> {
  // 所有错误详情通过日志记录，WebSocket 仅返回业务错误提示
  let sanitizedMessage = `${prefix}: ${INTERNAL_BUSINESS_ERROR_MESSAGE}`;

  // 如果是 AppError 且状态码小于 500，或者是开发环境，或者是 AI/Script 执行错误（通常包装在 AppError 中），则返回具体错误信息
  if (_error instanceof AppError) {
    // 如果是 500 错误，但在 AppError 中明确包装了错误信息，我们信任它已经处理过敏感信息
    sanitizedMessage = _error.message;
  } else if (_error instanceof Error) {
    // 对于普通 Error，如果是明确的脚本执行错误，也可以考虑透传，但为了安全起见，
    // 这里主要处理 AppError。如果在 createErrorResponse 调用前没有被包装成 AppError，
    // 则回退到通用错误信息，或者在开发环境下显示
    if (process.env.NODE_ENV === 'development') {
      sanitizedMessage = `${prefix}: ${_error.message}`;
    }
  } else if (typeof _error === 'string') {
    if (process.env.NODE_ENV === 'development') {
      sanitizedMessage = `${prefix}: ${_error}`;
    }
  }

  return buildOutboundFromMeta<string>(
    originalMessage.meta,
    // 使用原始消息的 action
    originalMessage.payload.action as any,
    'failed',
    {
      error: sanitizedMessage,
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
