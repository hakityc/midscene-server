import { createNodeWebSocket } from '@hono/node-ws';
import { WebSocketAction } from '../utils/enums.js';
import { wsLogger, setLogContextFromMessage } from '../utils/logger.js';
import { MessageBuilder } from './builders/messageBuilder.js';
import { handleConnectionError, handleMessageProcessingError, handleParseError, handleUnknownAction, } from './handlers/errorHandler.js';
import { createMessageHandlers } from './handlers/messageHandlers.js';
// 连接注册表：集中管理连接、统计与广播
class ConnectionRegistry {
    idToClient = new Map();
    add(connectionId, client) {
        this.idToClient.set(connectionId, client);
    }
    remove(connectionId) {
        this.idToClient.delete(connectionId);
    }
    get(connectionId) {
        return this.idToClient.get(connectionId);
    }
    keys() {
        return Array.from(this.idToClient.keys());
    }
    size() {
        return this.idToClient.size;
    }
    forEach(handler) {
        for (const [id, client] of this.idToClient)
            handler(id, client);
    }
}
// 单一职责：发送消息
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
// 健壮的 JSON 解析函数
function parseWebSocketMessage(rawData) {
    let cleanedData = rawData.replace(/^\uFEFF/, '').trim();
    try {
        return JSON.parse(cleanedData);
    }
    catch (firstError) {
        wsLogger.debug({
            error: firstError instanceof Error ? firstError.message : String(firstError),
            rawData: cleanedData.substring(0, 100) +
                (cleanedData.length > 100 ? '...' : ''),
        }, '首次解析失败，尝试修复格式');
    }
    try {
        cleanedData = cleanedData.replace(/'/g, '"');
        cleanedData = cleanedData.replace(/(\w+):/g, '"$1":');
        cleanedData = cleanedData.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(cleanedData);
    }
    catch (secondError) {
        wsLogger.debug({
            error: secondError instanceof Error
                ? secondError.message
                : String(secondError),
            cleanedData: cleanedData.substring(0, 100) +
                (cleanedData.length > 100 ? '...' : ''),
        }, '格式修复后仍解析失败，尝试更激进的修复');
    }
    // 仅支持新结构
    const result = (() => {
        try {
            return JSON.parse(cleanedData);
        }
        catch {
            return undefined;
        }
    })();
    if (result &&
        typeof result === 'object' &&
        result.meta &&
        typeof result.meta.messageId === 'string' &&
        typeof result.meta.conversationId === 'string' &&
        typeof result.meta.timestamp === 'number' &&
        result.payload &&
        typeof result.payload.action === 'string') {
        return result;
    }
    throw new Error(`无法解析 WebSocket 消息: ${rawData.substring(0, 200)}...`);
}
export const setupWebSocket = (app) => {
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
    const connections = new ConnectionRegistry();
    const handlers = createMessageHandlers();
    // 统一的消息调度
    const dispatchMessage = async (connectionId, message, ws) => {
        // 设置日志上下文，包含 messageId 等信息
        setLogContextFromMessage(message, connectionId);
        const action = message.payload?.action ?? message.content?.action;
        const isKnownAction = Object.values(WebSocketAction).includes(String(action));
        if (!isKnownAction) {
            handleUnknownAction(ws, message, String(action));
            return;
        }
        const handler = handlers[action];
        if (!handler) {
            handleUnknownAction(ws, message, String(action));
            return;
        }
        await handler({ connectionId, ws, send: (m) => sendMessage(ws, m) }, message);
    };
    // WS 路由
    app.get('/ws', upgradeWebSocket((_c) => {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // const operateService = OperateService.getInstance();
        // operateService.start();
        return {
            onOpen(ws) {
                connections.add(connectionId, ws);
                wsLogger.info({ connectionId }, 'WebSocket 连接已建立');
                const welcomeMessage = MessageBuilder.createWelcomeMessage(connectionId);
                sendMessage(ws, welcomeMessage);
            },
            onMessage(event, ws) {
                try {
                    const rawData = event.data.toString();
                    wsLogger.debug({
                        connectionId,
                        rawData
                    }, '收到原始消息');
                    const message = parseWebSocketMessage(rawData);
                    wsLogger.debug({
                        connectionId,
                        action: message.payload?.action ??
                            message.content?.action,
                        messageId: message.meta?.messageId ??
                            message.message_id,
                    }, '解析成功');
                    // 异步处理，保证不阻塞
                    dispatchMessage(connectionId, message, ws).catch((error) => {
                        handleMessageProcessingError(ws, message, error, {
                            connectionId,
                            action: message.payload?.action ??
                                message.content?.action,
                        });
                    });
                }
                catch (error) {
                    handleParseError(ws, error, event.data.toString(), connectionId);
                }
            },
            onClose() {
                connections.remove(connectionId);
                wsLogger.info({ connectionId }, 'WebSocket 连接已关闭');
            },
            onError(error) {
                handleConnectionError(connectionId, error);
            },
        };
    }));
    // 管理接口 - 获取连接统计
    app.get('/ws/stats', (c) => {
        return c.json({
            success: true,
            data: {
                totalConnections: connections.size(),
                connections: connections.keys(),
            },
        });
    });
    // 管理接口 - 广播消息
    app.post('/ws/broadcast', async (c) => {
        try {
            const body = await c.req.json();
            const { message } = body;
            let sentCount = 0;
            const broadcastMessage = MessageBuilder.createBroadcastMessage(message);
            connections.forEach((_id, ws) => {
                if (sendMessage(ws, broadcastMessage)) {
                    sentCount++;
                }
            });
            return c.json({
                success: true,
                data: { sentCount, totalConnections: connections.size() },
            });
        }
        catch (error) {
            return c.json({
                success: false,
                error: '广播消息失败',
                details: error instanceof Error ? error.message : String(error),
            }, 400);
        }
    });
    return { injectWebSocket };
};
