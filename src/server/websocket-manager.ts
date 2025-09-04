// WebSocket 类型定义
interface WebSocket {
  readyState: number
  send(data: string): void
  close(): void
  on(event: string, listener: (...args: any[]) => void): void
}

// WebSocket 连接信息接口
export interface WebSocketConnection {
  id: string
  ws: WebSocket
  connectedAt: Date
  lastActivity: Date
  metadata?: Record<string, any>
}

// 新的 WebSocket 消息格式
export interface WebSocketMessage {
  message_id: string
  conversation_id: string
  content: {
    action: 'connectTab' | 'ai' | 'callback' | 'ping' | 'pong' | 'status' | 'error'
    body: string
  }
  timestamp: string
}

// 兼容旧格式的消息类型（用于内部处理）
export interface InternalWebSocketMessage {
  type: string
  data: any
  timestamp: string
  from?: string
  to?: string
  messageId?: string
  conversationId?: string
}

// WebSocket 管理器类
export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map()
  private logger: any

  constructor(logger: any) {
    this.logger = logger
    this.startCleanupInterval()
  }

  /**
   * 注册新的 WebSocket 连接
   */
  registerConnection(
    ws: WebSocket,
    connectionId: string,
    metadata?: Record<string, any>
  ): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      connectedAt: new Date(),
      lastActivity: new Date(),
      metadata
    }

    // 存储连接
    this.connections.set(connectionId, connection)

    // 设置连接事件监听
    this.setupConnectionEvents(connection)

    this.logger.info('🔌 WebSocket 连接已注册', {
      connectionId,
      totalConnections: this.connections.size
    })

    return connection
  }

  /**
   * 注销 WebSocket 连接
   */
  unregisterConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    // 关闭连接
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close()
    }

    // 从连接映射中移除
    this.connections.delete(connectionId)

    this.logger.info('🔌 WebSocket 连接已注销', {
      connectionId,
      totalConnections: this.connections.size
    })

    return true
  }

  /**
   * 设置连接事件监听
   */
  private setupConnectionEvents(connection: WebSocketConnection): void {
    connection.ws.on('message', (data) => {
      this.updateActivity(connection.id)
      this.handleMessage(connection, data)
    })

    connection.ws.on('close', () => {
      this.unregisterConnection(connection.id)
    })

    connection.ws.on('error', (error: any) => {
      this.logger.error('❌ WebSocket 连接错误', {
        connectionId: connection.id,
        error: error?.message || String(error)
      })
      this.unregisterConnection(connection.id)
    })
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(connection: WebSocketConnection, data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())

      this.logger.info('📨 收到 WebSocket 消息', {
        connectionId: connection.id,
        messageId: message.message_id,
        conversationId: message.conversation_id,
        action: message.content.action
      })

      // 验证消息格式
      if (!this.validateMessage(message)) {
        this.sendErrorResponse(connection.id, '消息格式无效', 'unknown', 'unknown')
        return
      }

      // 根据 action 处理消息
      switch (message.content.action) {
        case 'connectTab':
          this.handleConnectTab(connection, message)
          break
        case 'ai':
          this.handleAIRequest(connection, message)
          break
        case 'callback':
          this.handleCallback(connection, message)
          break
        case 'ping':
          this.handlePing(connection, message)
          break
        case 'status':
          this.handleStatusQuery(connection, message)
          break
        default:
          this.logger.warn('⚠️ 未知的 action 类型', { action: message.content.action })
          this.sendErrorResponse(connection.id, `未知的 action 类型: ${message.content.action}`, message.message_id, message.conversation_id)
      }
    } catch (error) {
      this.logger.error('❌ 消息解析失败', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error)
      })
      this.sendErrorResponse(connection.id, '消息解析失败', 'unknown', 'unknown')
    }
  }

  /**
   * 验证消息格式
   */
  private validateMessage(message: any): message is WebSocketMessage {
    return (
      message &&
      typeof message.message_id === 'string' &&
      typeof message.conversation_id === 'string' &&
      message.content &&
      typeof message.content.action === 'string' &&
      typeof message.content.body === 'string' &&
      typeof message.timestamp === 'string'
    )
  }

  /**
   * 发送错误响应
   */
  private sendErrorResponse(connectionId: string, error: string, messageId: string, conversationId: string): void {
    this.sendToConnection(connectionId, {
      message_id: `error_${Date.now()}`,
      conversation_id: conversationId,
      content: {
        action: 'error',
        body: error
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理连接标签页消息
   */
  private handleConnectTab(connection: WebSocketConnection, message: WebSocketMessage): void {
    this.logger.info('🔗 处理连接标签页请求', {
      connectionId: connection.id,
      messageId: message.message_id,
      conversationId: message.conversation_id,
      body: message.content.body
    })

    // 更新连接元数据
    if (connection.metadata) {
      connection.metadata.tabInfo = {
        connected: true,
        connectedAt: new Date().toISOString(),
        description: message.content.body
      }
    }

    // 发送连接确认
    this.sendToConnection(connection.id, {
      message_id: `tab_connected_${Date.now()}`,
      conversation_id: message.conversation_id,
      content: {
        action: 'callback',
        body: `标签页连接成功: ${message.content.body}`
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理 AI 请求消息
   */
  private async handleAIRequest(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    this.logger.info('🤖 处理 AI 请求', {
      connectionId: connection.id,
      messageId: message.message_id,
      conversationId: message.conversation_id,
      body: message.content.body
    })

    try {
      // 动态导入 WebSocketService 以避免循环依赖
      const { getWebSocketService } = await import('../services/websocketService')
      const wsService = getWebSocketService(this)

      // 将新格式转换为内部格式进行处理
      const internalMessage: InternalWebSocketMessage = {
        type: 'browser_task',
        data: {
          prompt: message.content.body
        },
        timestamp: message.timestamp,
        messageId: message.message_id,
        conversationId: message.conversation_id
      }

      await wsService.handleBrowserTask(connection.id, internalMessage)
    } catch (error) {
      this.logger.error('❌ 处理 AI 请求失败', {
        connectionId: connection.id,
        messageId: message.message_id,
        error: error instanceof Error ? error.message : String(error)
      })

      this.sendToConnection(connection.id, {
        message_id: `ai_error_${Date.now()}`,
        conversation_id: message.conversation_id,
        content: {
          action: 'error',
          body: `AI 请求处理失败: ${error instanceof Error ? error.message : String(error)}`
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * 处理回调消息
   */
  private handleCallback(connection: WebSocketConnection, message: WebSocketMessage): void {
    this.logger.info('📞 处理回调消息', {
      connectionId: connection.id,
      messageId: message.message_id,
      conversationId: message.conversation_id,
      body: message.content.body
    })

    // 处理回调逻辑
    this.sendToConnection(connection.id, {
      message_id: `callback_received_${Date.now()}`,
      conversation_id: message.conversation_id,
      content: {
        action: 'callback',
        body: `回调消息已接收: ${message.content.body}`
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理心跳消息
   */
  private handlePing(connection: WebSocketConnection, message: WebSocketMessage): void {
    this.sendToConnection(connection.id, {
      message_id: `pong_${Date.now()}`,
      conversation_id: message.conversation_id,
      content: {
        action: 'pong',
        body: 'pong'
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理浏览器任务消息
   */
  private async handleBrowserTask(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      // 动态导入 WebSocketService 以避免循环依赖
      const { getWebSocketService } = await import('../services/websocketService')
      const wsService = getWebSocketService(this)

      // 将新格式转换为内部格式进行处理
      const internalMessage: InternalWebSocketMessage = {
        type: 'browser_task',
        data: {
          prompt: message.content.body
        },
        timestamp: message.timestamp,
        messageId: message.message_id,
        conversationId: message.conversation_id
      }

      await wsService.handleBrowserTask(connection.id, internalMessage)
    } catch (error) {
      this.logger.error('❌ 处理浏览器任务失败', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error)
      })

      this.sendToConnection(connection.id, {
        message_id: `ai_error_${Date.now()}`,
        conversation_id: message.conversation_id,
        content: {
          action: 'error',
          body: `AI 请求处理失败: ${error instanceof Error ? error.message : String(error)}`
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * 处理流式浏览器任务消息
   */
  private async handleStreamingBrowserTask(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      // 动态导入 WebSocketService 以避免循环依赖
      const { getWebSocketService } = await import('../services/websocketService')
      const wsService = getWebSocketService(this)

      await wsService.handleStreamingBrowserTask(connection.id, message)
    } catch (error) {
      this.logger.error('❌ 处理流式浏览器任务失败', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error)
      })

      this.sendToConnection(connection.id, {
        message_id: `stream_error_${Date.now()}`,
        conversation_id: message.conversation_id,
        content: {
          action: 'error',
          body: `流式任务处理失败: ${error instanceof Error ? error.message : String(error)}`
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * 处理状态查询消息
   */
  private handleStatusQuery(connection: WebSocketConnection, message: WebSocketMessage): void {
    const stats = this.getStats()
    const connectionInfo = stats.connections.find(conn => conn.id === connection.id)

    this.sendToConnection(connection.id, {
      message_id: `status_${Date.now()}`,
      conversation_id: message.conversation_id,
      content: {
        action: 'callback',
        body: JSON.stringify({
          connection: connectionInfo,
          serverStats: {
            totalConnections: stats.totalConnections
          }
        })
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 更新连接活动时间
   */
  private updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastActivity = new Date()
    }
  }

  /**
   * 发送消息到指定连接
   */
  sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      connection.ws.send(JSON.stringify(message))
      this.updateActivity(connectionId)
      return true
    } catch (error) {
      this.logger.error('❌ 发送消息失败', {
        connectionId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * 广播消息到所有连接
   */
  broadcast(message: WebSocketMessage, excludeConnectionId?: string): number {
    let sentCount = 0
    for (const [connectionId, connection] of this.connections) {
      if (excludeConnectionId && connectionId === excludeConnectionId) {
        continue
      }
      if (this.sendToConnection(connectionId, message)) {
        sentCount++
      }
    }
    return sentCount
  }


  /**
   * 获取连接统计信息
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        readyState: conn.ws.readyState
      }))
    }
  }

  /**
   * 清理非活跃连接
   */
  private cleanupInactiveConnections(): void {
    const now = new Date()
    const inactiveThreshold = 30 * 60 * 1000 // 30分钟

    const inactiveConnections: string[] = []

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime()
      if (timeSinceLastActivity > inactiveThreshold) {
        inactiveConnections.push(connectionId)
      }
    }

    inactiveConnections.forEach(connectionId => {
      this.logger.info('🧹 清理非活跃连接', { connectionId })
      this.unregisterConnection(connectionId)
    })

    if (inactiveConnections.length > 0) {
      this.logger.info('🧹 清理完成', {
        cleanedCount: inactiveConnections.length,
        remainingConnections: this.connections.size
      })
    }
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveConnections()
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

}

// 导出单例实例
let wsManager: WebSocketManager | null = null

export const getWebSocketManager = (logger?: any): WebSocketManager => {
  if (!wsManager && logger) {
    wsManager = new WebSocketManager(logger)
  }
  return wsManager!
}
