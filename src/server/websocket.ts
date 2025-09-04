import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import { getWebSocketManager } from './websocket-manager'
import { mastra } from '../mastra'

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
  const logger = mastra.getLogger()
  const wsManager = getWebSocketManager(logger)

  // 基础 WebSocket 连接
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        onOpen(ws: any) {
          // 注册连接
          wsManager.registerConnection(ws, connectionId, {
            userAgent: c.req.header('user-agent'),
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
            path: c.req.path
          })

          // 发送欢迎消息
          if (ws && typeof ws.send === 'function') {
            ws.send(JSON.stringify({
              message_id: `welcome_${Date.now()}`,
              conversation_id: 'system',
              content: {
                action: 'callback',
                body: JSON.stringify({
                  connectionId,
                  message: '连接已建立',
                  serverTime: new Date().toISOString()
                })
              },
              timestamp: new Date().toISOString()
            }))
          }

          logger.info('🔌 新的 WebSocket 连接已建立', {
            connectionId,
            totalConnections: wsManager.getStats().totalConnections
          })
        },
        onMessage(event, ws) {
          // 消息处理由 WebSocketManager 负责
          const dataLength = typeof event.data === 'string' ? event.data.length :
                            event.data instanceof ArrayBuffer ? event.data.byteLength :
                            event.data instanceof Blob ? event.data.size : 0
          logger.debug('📨 收到 WebSocket 消息', {
            connectionId,
            messageLength: dataLength
          })
        },
        onClose() {
          logger.info('🔌 WebSocket 连接已关闭', { connectionId })
        },
        onError(error: any) {
          logger.error('❌ WebSocket 连接错误', {
            connectionId,
            error: error?.message || String(error)
          })
        }
      }
    })
  )

  // 管理接口 - 获取连接统计
  app.get('/ws/stats', (c) => {
    const stats = wsManager.getStats()
    return c.json({
      success: true,
      data: stats
    })
  })

  // 管理接口 - 广播消息
  app.post('/ws/broadcast', async (c) => {
    try {
      const body = await c.req.json()
      const { message, excludeConnectionId, conversationId = 'broadcast' } = body
      
      const sentCount = wsManager.broadcast({
        message_id: `broadcast_${Date.now()}`,
        conversation_id: conversationId,
        content: {
          action: 'callback',
          body: typeof message === 'string' ? message : JSON.stringify(message)
        },
        timestamp: new Date().toISOString()
      }, excludeConnectionId)

      return c.json({
        success: true,
        data: { sentCount, totalConnections: wsManager.getStats().totalConnections }
      })
    } catch (error) {
      return c.json({
        success: false,
        error: '广播消息失败',
        details: error instanceof Error ? error.message : String(error)
      }, 400)
    }
  })


  return {
    injectWebSocket,
    wsManager
  }
}