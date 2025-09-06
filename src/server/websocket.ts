import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { mastra } from '../mastra';
import { OperateController } from '../controllers/operateController';

// WebSocket 消息格式
export interface WebSocketMessage {
  message_id: string;
  conversation_id: string;
  content: {
    action: 'connectTab' | 'ai' | 'callback';
    body: string;
  };
  timestamp: string;
}

// 简单的连接管理
const connections = new Map<string, any>();

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  const logger = mastra.getLogger();

  // 使用单例模式获取 OperateController 实例
  const operateController = new OperateController();

  // 发送消息到 WebSocket
  function sendMessage(ws: any, message: WebSocketMessage): boolean {
    try {
      if (ws && typeof ws.send === 'function') {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  // 处理接收到的消息
  function handleMessage(
    connectionId: string,
    message: WebSocketMessage,
    ws: any
  ) {
    const logger = mastra.getLogger();

    switch (message.content.action) {
      case 'connectTab':
        // 处理连接标签页请求
        logger.info('🔗 处理连接标签页请求', {
          connectionId,
          messageId: message.message_id,
        });

        // 使用单例模式初始化连接
        operateController.initialize({
          forceSameTabNavigation: true,
        }).then(() => {
          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'callback',
              body: `标签页连接成功: ${message.content.body}`,
            },
            timestamp: new Date().toISOString(),
          });
        }).catch((error) => {
          logger.error('❌ 标签页连接失败', { error: error.message });
          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'callback',
              body: `标签页连接失败: ${error.message}`,
            },
            timestamp: new Date().toISOString(),
          });
        });
        break;

      case 'ai':
        // 处理 AI 请求
        logger.info('🤖 处理 AI 请求', {
          connectionId,
          messageId: message.message_id,
        });
        operateController.execute(message.content.body);
        // 这里可以集成 AI 处理逻辑
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: {
            action: 'callback',
            body: `AI 处理完成: ${message.content.body}`,
          },
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        logger.warn('⚠️ 未知的 action 类型', {
          action: message.content.action,
        });
        sendMessage(ws, {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: {
            action: 'callback',
            body: `未知的 action 类型: ${message.content.action}`,
          },
          timestamp: new Date().toISOString(),
        });
    }
  }

  // WebSocket 连接
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const connectionId = `conn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        onOpen(ws: any) {
          // 存储连接
          connections.set(connectionId, ws);

          logger.info('🔌 WebSocket 连接已建立', { connectionId });

          // 发送欢迎消息
          sendMessage(ws, {
            message_id: `welcome_${Date.now()}`,
            conversation_id: 'system',
            content: {
              action: 'callback',
              body: JSON.stringify({
                connectionId,
                message: '连接已建立',
                serverTime: new Date().toISOString(),
              }),
            },
            timestamp: new Date().toISOString(),
          });
        },

        onMessage(event, ws) {
          try {
            const message: WebSocketMessage = JSON.parse(event.data.toString());
            logger.info('📨 收到消息', {
              connectionId,
              action: message.content.action,
              messageId: message.message_id,
            });

            // 处理消息
            handleMessage(connectionId, message, ws);
          } catch (error) {
            logger.error('❌ 消息解析失败', {
              connectionId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },

        onClose() {
          // 移除连接
          connections.delete(connectionId);
          logger.info('🔌 WebSocket 连接已关闭', { connectionId });
        },

        onError(error: any) {
          logger.error('❌ WebSocket 连接错误', {
            connectionId,
            error: error?.message || String(error),
          });
        },
      };
    })
  );

  // 管理接口 - 获取连接统计
  app.get('/ws/stats', (c) => {
    return c.json({
      success: true,
      data: {
        totalConnections: connections.size,
        connections: Array.from(connections.keys()),
      },
    });
  });

  // 管理接口 - 广播消息
  app.post('/ws/broadcast', async (c) => {
    try {
      const body = await c.req.json();
      const { message, conversationId = 'broadcast' } = body;

      let sentCount = 0;
      for (const [connectionId, ws] of connections) {
        if (
          sendMessage(ws, {
            message_id: `broadcast_${Date.now()}`,
            conversation_id: conversationId,
            content: {
              action: 'callback',
              body:
                typeof message === 'string' ? message : JSON.stringify(message),
            },
            timestamp: new Date().toISOString(),
          })
        ) {
          sentCount++;
        }
      }

      return c.json({
        success: true,
        data: { sentCount, totalConnections: connections.size },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: '广播消息失败',
          details: error instanceof Error ? error.message : String(error),
        },
        400
      );
    }
  });

  return { injectWebSocket };
};
