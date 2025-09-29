import { WebSocketAction } from '../../utils/enums.js';
/**
 * 构建基础消息
 */
function buildOutbound(messageId, conversationId, action, status, data) {
    return {
        meta: {
            messageId,
            conversationId,
            timestamp: Math.floor(Date.now() / 1000),
        },
        payload: {
            action,
            status,
            ...(status === 'success' ? { result: data?.result } : {}),
            ...(status === 'failed' ? { error: data?.error ?? 'UNKNOWN_ERROR' } : {}),
        },
    };
}
/**
 * 构建成功响应消息
 */
export function createSuccessResponse(originalMessage, result, action = WebSocketAction.CALLBACK) {
    const messageId = originalMessage.meta.messageId;
    const conversationId = originalMessage.meta.conversationId;
    return buildOutbound(messageId, conversationId, action, 'success', {
        result,
    });
}
/**
 * 构建包含额外元数据的成功响应消息
 */
export function createSuccessResponseWithMeta(originalMessage, result, metadata, action = WebSocketAction.CALLBACK) {
    const messageId = originalMessage.meta.messageId;
    const conversationId = originalMessage.meta.conversationId;
    return buildOutbound(messageId, conversationId, action, 'success', {
        result: { data: result, meta: metadata },
    });
}
/**
 * 构建错误响应消息
 */
export function createErrorResponse(originalMessage, error, prefix = '操作失败') {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const messageId = originalMessage.meta.messageId;
    const conversationId = originalMessage.meta.conversationId;
    return buildOutbound(messageId, conversationId, 
    // 使用原始消息的 action
    originalMessage.payload.action, 'failed', {
        error: `${prefix}: ${errorMessage}`,
    });
}
/**
 * 构建系统消息
 */
export function createSystemMessage(messageId, body, action = WebSocketAction.CALLBACK) {
    return buildOutbound(messageId, 'system', action, 'success', {
        result: body,
    });
}
/**
 * 构建广播消息
 */
export function createBroadcastMessage(message) {
    const body = typeof message === 'string' ? message : JSON.stringify(message);
    return buildOutbound(`broadcast_${Date.now()}`, 'broadcast', WebSocketAction.CALLBACK, 'success', { result: body });
}
/**
 * 构建欢迎消息
 */
export function createWelcomeMessage(connectionId) {
    const welcomeData = {
        connectionId,
        message: '连接已建立',
        serverTime: new Date().toISOString(),
    };
    return buildOutbound(`welcome_${Date.now()}`, 'system', WebSocketAction.CALLBACK, 'success', { result: JSON.stringify(welcomeData) });
}
/**
 * 构建未知动作响应消息
 */
export function createUnknownActionResponse(originalMessage, action) {
    const messageId = originalMessage.meta.messageId;
    const conversationId = originalMessage.meta.conversationId;
    return buildOutbound(messageId, conversationId, 
    // 沿用传入的未知 action 字符串
    action, 'failed', { error: `未知的 action 类型: ${action}` });
}
/**
 * 构建解析错误响应消息
 */
export function createParseErrorResponse(error, _connectionId) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return buildOutbound(`parse_error_${Date.now()}`, 'system', WebSocketAction.ERROR, 'failed', { error: `消息解析失败: ${errorMessage}` });
}
/**
 * 构建处理失败响应消息
 */
export function createProcessingErrorResponse(originalMessage, error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const messageId = originalMessage.meta.messageId;
    const conversationId = originalMessage.meta.conversationId;
    return buildOutbound(messageId, conversationId, 
    // 使用原始消息的 action
    originalMessage.payload.action, 'failed', { error: `消息处理失败: ${errorMessage}` });
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
