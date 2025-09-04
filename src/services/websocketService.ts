import {
  WebSocketManager,
  WebSocketMessage,
  InternalWebSocketMessage,
} from '../server/websocket-manager';
import {
  browserController,
  BrowserTaskResult,
} from '../controllers/browserController';
import { mastra } from '../mastra';

export class WebSocketService {
  private logger = mastra.getLogger();
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  /**
   * 处理浏览器任务请求
   */
  async handleBrowserTask(
    connectionId: string,
    message: InternalWebSocketMessage
  ): Promise<void> {
    const { data } = message;
    const prompt = data.body

    if (!prompt) {
      this.sendError(connectionId, '缺少任务提示词');
      return;
    }

    // 发送任务开始消息
    this.sendToConnection(connectionId, {
      message_id: `task_start_${Date.now()}`,
      conversation_id: message.conversationId || 'default',
      content: {
        action: 'callback',
        body: JSON.stringify({
          message: '浏览器任务开始执行...',
          prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        }),
      },
      timestamp: new Date().toISOString(),
    });

    try {
      this.logger.info('🚀 开始执行 WebSocket 浏览器任务', {
        connectionId,
        promptLength: prompt.length,
      });

      // 执行浏览器任务
      const result: BrowserTaskResult =
        await browserController.executeBrowserTask(prompt);

      // 发送任务完成消息
      this.sendToConnection(connectionId, {
        message_id: `task_complete_${Date.now()}`,
        conversation_id: message.conversationId || 'default',
        content: {
          action: 'callback',
          body: JSON.stringify({
            success: result.success,
            data: result.data,
            error: result.error,
            details: result.details,
            metadata: result.metadata,
          }),
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.info('✅ WebSocket 浏览器任务完成', {
        connectionId,
        success: result.success,
        hasData: !!result.data,
      });
    } catch (error) {
      this.logger.error('❌ WebSocket 浏览器任务执行失败', {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.sendError(connectionId, '任务执行失败', error);
    }
  }

  /**
   * 处理流式浏览器任务（实时更新进度）
   */
  async handleStreamingBrowserTask(
    connectionId: string,
    message: WebSocketMessage
  ): Promise<void> {
    const { content } = message;
    const prompt = content.body

    if (!prompt) {
      this.sendError(connectionId, '缺少任务提示词');
      return;
    }


    // 发送任务开始消息
    this.sendToConnection(connectionId, {
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      content: {
        action: 'callback',
        body: JSON.stringify({
          message: '开始流式执行浏览器任务...',
          prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        }),
      },
      timestamp: new Date().toISOString(),
    });

    try {
      this.logger.info('🚀 开始执行流式 WebSocket 浏览器任务', {
        connectionId,
        promptLength: prompt.length,
      });

      // 这里可以集成流式处理逻辑
      // 目前先使用普通任务处理
      const result: BrowserTaskResult =
        await browserController.executeBrowserTask(prompt);

      // 发送流式更新消息
      this.sendToConnection(connectionId, {
        message_id: message.message_id,
        conversation_id: message.conversation_id,
        content: {
          action: 'callback',
          body: JSON.stringify({
            status: 'processing',
            message: '正在处理任务结果...',
            progress: 50,
          }),
        },
        timestamp: new Date().toISOString(),
      });

      // 模拟处理延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 发送最终结果
      this.sendToConnection(connectionId, {
        message_id: message.message_id,
        conversation_id: message.conversation_id,
        content: {
          action: 'callback',
          body: JSON.stringify({
            success: result.success,
            data: result.data,
            error: result.error,
            details: result.details,
            metadata: result.metadata,
            progress: 100,
          }),
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.info('✅ 流式 WebSocket 浏览器任务完成', {
        connectionId,
        success: result.success,
      });
    } catch (error) {
      this.logger.error('❌ 流式 WebSocket 浏览器任务执行失败', {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.sendError(connectionId, '流式任务执行失败', error);
    }
  }

  /**
   * 处理心跳检测
   */
  handleHeartbeat(
    connectionId: string,
    message: InternalWebSocketMessage
  ): void {
    this.sendToConnection(connectionId, {
      message_id: `heartbeat_${Date.now()}`,
      conversation_id: message.conversationId || 'default',
      content: {
        action: 'pong',
        body: 'pong',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理连接状态查询
   */
  handleStatusQuery(
    connectionId: string,
    message: InternalWebSocketMessage
  ): void {
    const stats = this.wsManager.getStats();
    const connection = stats.connections.find(
      (conn) => conn.id === connectionId
    );

    this.sendToConnection(connectionId, {
      message_id: `status_${Date.now()}`,
      conversation_id: message.conversationId || 'default',
      content: {
        action: 'callback',
        body: JSON.stringify({
          connection: connection,
          serverStats: {
            totalConnections: stats.totalConnections,
            userConnections: stats.connections.length,
            sessionConnections: stats.connections.length,
          },
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送错误消息
   */
  private sendError(
    connectionId: string,
    error: string,
    details?: any
  ): void {
    this.sendToConnection(connectionId, {
      message_id: `error_${Date.now()}`,
      conversation_id: 'default',
      content: {
        action: 'error',
        body: JSON.stringify({
          error,
          details: details instanceof Error ? details.message : details,
          timestamp: new Date().toISOString(),
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送消息到指定连接
   */
  private sendToConnection(
    connectionId: string,
    message: WebSocketMessage
  ): boolean {
    return this.wsManager.sendToConnection(connectionId, message);
  }

  /**
   * 广播系统消息
   */
  broadcastSystemMessage(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ): number {
    return this.wsManager.broadcast({
      message_id: `system_${Date.now()}`,
      conversation_id: 'system',
      content: {
        action: 'callback',
        body: JSON.stringify({
          message,
          level: type,
          serverTime: new Date().toISOString(),
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 广播浏览器任务结果
   */
  broadcastBrowserTaskResult(
    result: BrowserTaskResult
  ): number {
    return this.wsManager.broadcast({
      message_id: `broadcast_${Date.now()}`,
      conversation_id: 'broadcast',
      content: {
        action: 'callback',
        body: JSON.stringify({
          result,
          serverTime: new Date().toISOString(),
        }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// 导出单例实例
let wsService: WebSocketService | null = null;

export const getWebSocketService = (
  wsManager: WebSocketManager
): WebSocketService => {
  if (!wsService) {
    wsService = new WebSocketService(wsManager);
  }
  return wsService;
};
