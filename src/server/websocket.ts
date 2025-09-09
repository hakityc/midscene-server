import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
// 移除 mastra 导入
import { OperateController } from '../controllers/operateController';
import { WebSocketAction } from '../utils/enums';
import type { ConnectCurrentTabOption } from '../types/operate';
import { wsLogger, controllerLogger } from '../utils/logger';

// WebSocket 消息格式
export interface WebSocketMessage {
  message_id: string;
  conversation_id: string;
  content: {
    action: WebSocketAction;
    body: string;
  };
  timestamp: string;
}

type WebSocketClient = any;

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
function sendMessage(ws: WebSocketClient, message: WebSocketMessage): boolean {
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
    wsLogger.debug({
      error: firstError instanceof Error ? firstError.message : String(firstError),
      rawData: cleanedData.substring(0, 100) + (cleanedData.length > 100 ? '...' : ''),
    }, '首次解析失败，尝试修复格式');
  }

  try {
    cleanedData = cleanedData.replace(/'/g, '"');
    cleanedData = cleanedData.replace(/(\w+):/g, '"$1":');
    cleanedData = cleanedData.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleanedData);
  } catch (secondError) {
    wsLogger.debug({
      error: secondError instanceof Error ? secondError.message : String(secondError),
      cleanedData: cleanedData.substring(0, 100) + (cleanedData.length > 100 ? '...' : ''),
    }, '格式修复后仍解析失败，尝试更激进的修复');
  }

  try {
    const safeEval = new Function('return ' + cleanedData);
    const result = safeEval();
    if (result && typeof result === 'object' && result.content && result.content.action) {
      return result as WebSocketMessage;
    }
  } catch (evalError) {
    wsLogger.debug({
      error: evalError instanceof Error ? evalError.message : String(evalError),
    }, 'eval 解析也失败');
  }

  throw new Error(`无法解析 WebSocket 消息: ${rawData.substring(0, 200)}...`);
}

// 基于动作的处理器映射，替代大 switch，提高可维护性
type MessageHandler = (
  ctx: {
    connectionId: string;
    ws: WebSocketClient;
    send: (m: WebSocketMessage) => void;
  },
  message: WebSocketMessage
) => Promise<void>;

function createHandlers(operateController: OperateController): Record<WebSocketAction, MessageHandler> {
  return {
    [WebSocketAction.CONNECT_TAB]: async ({ ws }, message) => {
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
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: { action: WebSocketAction.CALLBACK, body: `标签页连接成功: ${message.content.body}` },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        wsLogger.error({ error, messageId: message.message_id }, '标签页连接失败');
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: {
            action: WebSocketAction.ERROR,
            body: `标签页连接失败: ${error instanceof Error ? error.message : String(error)}`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    },

    [WebSocketAction.AI]: async ({ ws, connectionId }, message) => {
      wsLogger.info({ connectionId, messageId: message.message_id, action: 'ai_request' }, '处理 AI 请求');
      try {
        await operateController.execute(message.content.body);
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: { action: WebSocketAction.CALLBACK, body: `AI 处理完成: ${message.content.body}` },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        wsLogger.error({ connectionId, error, messageId: message.message_id }, 'AI 处理失败');
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: {
            action: WebSocketAction.ERROR,
            body: `AI 处理失败: ${error instanceof Error ? error.message : String(error)}`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    },

    // 未使用到的动作可在此按需实现
    [WebSocketAction.CALLBACK]: async () => {},
    [WebSocketAction.ERROR]: async () => {},
  } as Record<WebSocketAction, MessageHandler>;
}

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  const operateController = new OperateController();
  const connections = new ConnectionRegistry();
  const handlers = createHandlers(operateController);

  // 统一的消息调度
  const dispatchMessage = async (
    connectionId: string,
    message: WebSocketMessage,
    ws: WebSocketClient
  ) => {
    const handler = handlers[message.content.action];
    if (!handler) {
      wsLogger.warn({ action: message.content.action, messageId: message.message_id }, '未知的 action 类型');
      sendMessage(ws, {
        message_id: message.message_id,
        conversation_id: message.conversation_id,
        content: { action: WebSocketAction.CALLBACK, body: `未知的 action 类型: ${message.content.action}` },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    await handler({ connectionId, ws, send: (m) => sendMessage(ws, m) }, message);
  };

  // WS 路由
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        onOpen(ws: WebSocketClient) {
          connections.add(connectionId, ws);
          wsLogger.info({ connectionId }, 'WebSocket 连接已建立');

          sendMessage(ws, {
            message_id: `welcome_${Date.now()}`,
            conversation_id: 'system',
            content: {
              action: WebSocketAction.CALLBACK,
              body: JSON.stringify({ connectionId, message: '连接已建立', serverTime: new Date().toISOString() }),
            },
            timestamp: new Date().toISOString(),
          });
        },

        onMessage(event, ws) {
          try {
            const rawData = event.data.toString();
            wsLogger.debug({
              connectionId,
              rawData: rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''),
            }, '收到原始消息');

            const message: WebSocketMessage = parseWebSocketMessage(rawData);
            wsLogger.debug({ connectionId, action: message.content.action, messageId: message.message_id }, '解析成功');

            // 异步处理，保证不阻塞
            dispatchMessage(connectionId, message, ws).catch((error) => {
              wsLogger.error({
                connectionId,
                error,
                messageId: message.message_id,
              }, '消息处理失败');
              sendMessage(ws, {
                message_id: message.message_id || `error_${Date.now()}`,
                conversation_id: message.conversation_id || 'system',
                content: {
                  action: WebSocketAction.ERROR,
                  body: `消息处理失败: ${error instanceof Error ? error.message : String(error)}`,
                },
                timestamp: new Date().toISOString(),
              });
            });
          } catch (error) {
            wsLogger.error({
              connectionId,
              error,
              rawData: event.data.toString().substring(0, 200) + (event.data.toString().length > 200 ? '...' : ''),
            }, '消息解析失败');
            sendMessage(ws, {
              message_id: `parse_error_${Date.now()}`,
              conversation_id: 'system',
              content: {
                action: WebSocketAction.ERROR,
                body: `消息解析失败: ${error instanceof Error ? error.message : String(error)}`,
              },
              timestamp: new Date().toISOString(),
            });
          }
        },

        onClose() {
          connections.remove(connectionId);
          wsLogger.info({ connectionId }, 'WebSocket 连接已关闭');
        },

        onError(error: any) {
          wsLogger.error({ connectionId, error }, 'WebSocket 连接错误');
        },
      };
    })
  );

  // 管理接口 - 获取连接统计
  app.get('/ws/stats', (c) => {
    return c.json({
      success: true,
      data: { totalConnections: connections.size(), connections: connections.keys() },
    });
  });

  // 管理接口 - 广播消息
  app.post('/ws/broadcast', async (c) => {
    try {
      const body = await c.req.json();
      const { message, conversationId = 'broadcast' } = body;

      let sentCount = 0;
      connections.forEach((_id, ws) => {
        if (
          sendMessage(ws, {
            message_id: `broadcast_${Date.now()}`,
            conversation_id: conversationId,
            content: {
              action: WebSocketAction.CALLBACK,
              body: typeof message === 'string' ? message : JSON.stringify(message),
            },
            timestamp: new Date().toISOString(),
          })
        ) {
          sentCount++;
        }
      });

      return c.json({ success: true, data: { sentCount, totalConnections: connections.size() } });
    } catch (error) {
      return c.json(
        { success: false, error: '广播消息失败', details: error instanceof Error ? error.message : String(error) },
        400
      );
    }
  });

  return { injectWebSocket };
};
