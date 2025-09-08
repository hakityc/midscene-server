import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
// 移除 mastra 导入
import { OperateController } from '../controllers/operateController';

// WebSocket 消息格式
export interface WebSocketMessage {
  message_id: string;
  conversation_id: string;
  content: {
    action: 'connectTab' | 'ai' | 'callback' | 'error';
    body: string;
  };
  timestamp: string;
}

// 简单的连接管理
const connections = new Map<string, any>();

// 健壮的 JSON 解析函数
function parseWebSocketMessage(rawData: string): WebSocketMessage {
  let cleanedData = rawData;

  // 1. 移除可能的 BOM 字符
  cleanedData = cleanedData.replace(/^\uFEFF/, '');

  // 2. 移除前后空白字符
  cleanedData = cleanedData.trim();

  // 3. 尝试直接解析
  try {
    return JSON.parse(cleanedData);
  } catch (firstError) {
    console.log('🔧 首次解析失败，尝试修复格式...', {
      error:
        firstError instanceof Error ? firstError.message : String(firstError),
      rawData:
        cleanedData.substring(0, 100) + (cleanedData.length > 100 ? '...' : ''),
    });
  }

  // 4. 修复常见的格式问题
  try {
    // 将单引号替换为双引号（但要小心字符串内的单引号）
    cleanedData = cleanedData.replace(/'/g, '"');

    // 确保所有对象键都使用双引号
    cleanedData = cleanedData.replace(/(\w+):/g, '"$1":');

    // 修复可能的尾随逗号
    cleanedData = cleanedData.replace(/,(\s*[}\]])/g, '$1');

    return JSON.parse(cleanedData);
  } catch (secondError) {
    console.log('🔧 格式修复后仍解析失败，尝试更激进的修复...', {
      error:
        secondError instanceof Error
          ? secondError.message
          : String(secondError),
      cleanedData:
        cleanedData.substring(0, 100) + (cleanedData.length > 100 ? '...' : ''),
    });
  }

  // 5. 最后的尝试：使用 eval（仅用于调试，生产环境应避免）
  try {
    // 创建一个安全的评估环境
    const safeEval = new Function('return ' + cleanedData);
    const result = safeEval();

    // 验证结果是否符合预期格式
    if (
      result &&
      typeof result === 'object' &&
      result.content &&
      result.content.action
    ) {
      return result as WebSocketMessage;
    }
  } catch (evalError) {
    console.log('🔧 eval 解析也失败', {
      error: evalError instanceof Error ? evalError.message : String(evalError),
    });
  }

  // 6. 如果所有方法都失败，抛出原始错误
  throw new Error(`无法解析 WebSocket 消息: ${rawData.substring(0, 200)}...`);
}

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  // 移除 mastra logger

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
  async function handleMessage(
    connectionId: string,
    message: WebSocketMessage,
    ws: any
  ) {
    switch (message.content.action) {
      case 'connectTab':
        // 处理连接标签页请求
        console.log('🔗 处理连接标签页请求', {
          connectionId,
          messageId: message.message_id,
        });

        try {
          const option = {
            forceSameTabNavigation: true,
          };
          message.content.body !== '' &&
            Object.assign(option, {
              // 这里 tabId 还是 tabIndex 取决于云应用那边（目前暂定 tabIndex）
              tabIndex: message.content.body,
            });
          await operateController.connectCurrentTab(option);
          console.log('✅ 标签页连接成功', option);
          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'callback',
              body: `标签页连接成功: ${message.content.body}`,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('❌ 标签页连接失败', error);

          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'error',
              body: `标签页连接失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'ai':
        // 处理 AI 请求
        console.log('🤖 处理 AI 请求', {
          connectionId,
          messageId: message.message_id,
        });

        try {
          await operateController.execute(message.content.body);

          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'callback',
              body: `AI 处理完成: ${message.content.body}`,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('❌ AI 处理失败', {
            connectionId,
            error: error instanceof Error ? error.message : String(error),
          });

          sendMessage(ws, {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            content: {
              action: 'error',
              body: `AI 处理失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        console.warn('⚠️ 未知的 action 类型', {
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

          console.log('🔌 WebSocket 连接已建立', { connectionId });

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
            const rawData = event.data.toString();
            console.log('📨 收到原始消息', {
              connectionId,
              rawData:
                rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''),
            });

            // 使用健壮的解析函数
            const message: WebSocketMessage = parseWebSocketMessage(rawData);
            console.log('📨 解析成功', {
              connectionId,
              action: message.content.action,
              messageId: message.message_id,
            });

            // 处理消息（异步调用，但不等待结果，避免阻塞）
            handleMessage(connectionId, message, ws).catch((error) => {
              console.error('❌ 消息处理失败', {
                connectionId,
                error: error instanceof Error ? error.message : String(error),
              });

              // 发送错误消息给客户端
              sendMessage(ws, {
                message_id: message.message_id || `error_${Date.now()}`,
                conversation_id: message.conversation_id || 'system',
                content: {
                  action: 'error',
                  body: `消息处理失败: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
                timestamp: new Date().toISOString(),
              });
            });
          } catch (error) {
            console.error('❌ 消息解析失败', {
              connectionId,
              error: error instanceof Error ? error.message : String(error),
              rawData:
                event.data.toString().substring(0, 200) +
                (event.data.toString().length > 200 ? '...' : ''),
            });

            // 发送解析错误消息给客户端
            sendMessage(ws, {
              message_id: `parse_error_${Date.now()}`,
              conversation_id: 'system',
              content: {
                action: 'error',
                body: `消息解析失败: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
              timestamp: new Date().toISOString(),
            });
          }
        },

        onClose() {
          // 移除连接
          connections.delete(connectionId);
          console.log('🔌 WebSocket 连接已关闭', { connectionId });
        },

        onError(error: any) {
          console.error('❌ WebSocket 连接错误', {
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
