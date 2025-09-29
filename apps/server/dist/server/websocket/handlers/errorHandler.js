import { wsLogger } from '../../utils/logger.js';
import { MessageBuilder } from '../builders/messageBuilder.js';
/**
 * 安全发送消息
 */
function sendMessage(ws, message) {
    try {
        if (ws && typeof ws.send === 'function') {
            ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
    catch (error) {
        wsLogger.error({ error }, '发送消息失败');
        return false;
    }
}
/**
 * 处理消息处理过程中的错误
 */
export async function handleMessageProcessingError(ws, message, error, context) {
    const { connectionId, action } = context;
    wsLogger.error({
        connectionId,
        error,
        messageId: message.meta.messageId,
        action,
    }, '消息处理失败');
    const errorResponse = MessageBuilder.createProcessingErrorResponse(message, error);
    sendMessage(ws, errorResponse);
}
/**
 * 处理消息解析错误
 */
export function handleParseError(ws, error, rawData, connectionId) {
    wsLogger.error({
        connectionId,
        error,
        rawData: rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''),
    }, '消息解析失败');
    const errorResponse = MessageBuilder.createParseErrorResponse(error, connectionId);
    sendMessage(ws, errorResponse);
}
/**
 * 处理未知动作类型错误
 */
export function handleUnknownAction(ws, message, action) {
    wsLogger.warn({
        action,
        messageId: message.meta.messageId,
    }, '未知的 action 类型');
    const response = MessageBuilder.createUnknownActionResponse(message, action);
    sendMessage(ws, response);
}
/**
 * 处理连接错误
 */
export function handleConnectionError(connectionId, error) {
    wsLogger.error({ connectionId, error }, 'WebSocket 连接错误');
}
/**
 * 通用错误处理装饰器
 * 用于包装消息处理器，自动处理错误
 */
export function withErrorHandling(handler, errorContext) {
    return async (ws, message, ...args) => {
        try {
            await handler(ws, message, ...args);
        }
        catch (error) {
            await handleMessageProcessingError(ws, message, error, errorContext);
        }
    };
}
