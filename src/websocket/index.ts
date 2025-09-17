import { createNodeWebSocket } from '@hono/node-ws';
import type { Hono } from 'hono';
import { OperateService } from '../services/operateService';
import type { WebSocketClient, WebSocketMessage } from '../types/websocket';
import { WebSocketAction } from '../utils/enums';
import { wsLogger } from '../utils/logger';
import { MessageBuilder } from './builders/messageBuilder';
import {
  handleConnectionError,
  handleMessageProcessingError,
  handleParseError,
  handleUnknownAction,
} from './handlers/errorHandler';
import { createMessageHandlers } from './handlers/messageHandlers';

// 连接注册表：集中管理连接、统计与广播
class ConnectionRegistry {
  private readonly idToClient = new Map<string, WebSocketClient>();

  add(connectionId: string, client: WebSocketClient): void {
    this.idToClient.set(connectionId, client);
  }

  remove(connectionId: string): void {
    this.idToClient.delete(connectionId);
  }

  get(connectionId: string): WebSocketClient | undefined {
    return this.idToClient.get(connectionId);
  }

  keys(): string[] {
    return Array.from(this.idToClient.keys());
  }

  size(): number {
    return this.idToClient.size;
  }

  forEach(handler: (id: string, client: WebSocketClient) => void): void {
    for (const [id, client] of this.idToClient) handler(id, client);
  }
}

// 单一职责：发送消息
function sendMessage(ws: WebSocketClient, message: any): boolean {
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

// 健壮的 JSON 解析函数
function parseWebSocketMessage(rawData: string): WebSocketMessage {
  let cleanedData = rawData.replace(/^\uFEFF/, '').trim();

  try {
    return JSON.parse(cleanedData);
  } catch (firstError) {
    wsLogger.debug(
      {
        error:
          firstError instanceof Error ? firstError.message : String(firstError),
        rawData:
          cleanedData.substring(0, 100) +
          (cleanedData.length > 100 ? '...' : ''),
      },
      '首次解析失败，尝试修复格式',
    );
  }

  try {
    cleanedData = cleanedData.replace(/'/g, '"');
    cleanedData = cleanedData.replace(/(\w+):/g, '"$1":');
    cleanedData = cleanedData.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleanedData);
  } catch (secondError) {
    wsLogger.debug(
      {
        error:
          secondError instanceof Error
            ? secondError.message
            : String(secondError),
        cleanedData:
          cleanedData.substring(0, 100) +
          (cleanedData.length > 100 ? '...' : ''),
      },
      '格式修复后仍解析失败，尝试更激进的修复',
    );
  }

  // 仅支持新结构
  const result = (() => {
    try {
      return JSON.parse(cleanedData);
    } catch {
      return undefined;
    }
  })();
  if (
    result &&
    typeof result === 'object' &&
    (result as any).meta &&
    typeof (result as any).meta.messageId === 'string' &&
    typeof (result as any).meta.conversationId === 'string' &&
    typeof (result as any).meta.timestamp === 'number' &&
    (result as any).payload &&
    typeof (result as any).payload.action === 'string'
  ) {
    return result as unknown as WebSocketMessage;
  }

  throw new Error(`无法解析 WebSocket 消息: ${rawData.substring(0, 200)}...`);
}

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  const connections = new ConnectionRegistry();
  const handlers = createMessageHandlers();

  // 统一的消息调度
  const dispatchMessage = async (
    connectionId: string,
    message: WebSocketMessage,
    ws: WebSocketClient,
  ) => {
    const action =
      (message as any).payload?.action ?? (message as any).content?.action;
    const isKnownAction = (Object.values(WebSocketAction) as string[]).includes(
      String(action),
    );
    if (!isKnownAction) {
      handleUnknownAction(ws, message as any, String(action));
      return;
    }
    const handler = handlers[action as WebSocketAction];
    if (!handler) {
      handleUnknownAction(ws, message as any, String(action));
      return;
    }
    await handler(
      { connectionId, ws, send: (m: any) => sendMessage(ws, m) },
      message,
    );
  };

  // WS 路由
  app.get(
    '/ws',
    upgradeWebSocket((_c) => {
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const operateService = OperateService.getInstance();
      operateService.initialize();

      return {
        onOpen(ws: WebSocketClient) {
          connections.add(connectionId, ws);
          wsLogger.info({ connectionId }, 'WebSocket 连接已建立');

          const welcomeMessage =
            MessageBuilder.createWelcomeMessage(connectionId);
          sendMessage(ws, welcomeMessage);
        },

        onMessage(event, ws) {
          try {
            const rawData = event.data.toString();
            wsLogger.debug(
              {
                connectionId,
                rawData:
                  rawData.substring(0, 200) +
                  (rawData.length > 200 ? '...' : ''),
              },
              '收到原始消息',
            );

            const message: WebSocketMessage = parseWebSocketMessage(rawData);
            wsLogger.debug(
              {
                connectionId,
                action:
                  (message as any).payload?.action ??
                  (message as any).content?.action,
                messageId:
                  (message as any).meta?.messageId ??
                  (message as any).message_id,
              },
              '解析成功',
            );

            // 异步处理，保证不阻塞
            dispatchMessage(connectionId, message, ws).catch((error) => {
              handleMessageProcessingError(ws, message, error, {
                connectionId,
                action:
                  (message as any).payload?.action ??
                  (message as any).content?.action,
              });
            });
          } catch (error) {
            handleParseError(ws, error, event.data.toString(), connectionId);
          }
        },

        onClose() {
          connections.remove(connectionId);
          wsLogger.info({ connectionId }, 'WebSocket 连接已关闭');
        },

        onError(error: any) {
          handleConnectionError(connectionId, error);
        },
      };
    }),
  );

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
    } catch (error) {
      return c.json(
        {
          success: false,
          error: '广播消息失败',
          details: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  return { injectWebSocket };
};
