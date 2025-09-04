import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

export const setupWebSocket = (app: Hono) => {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      return {
        onMessage(event, ws) {
          console.log(`来自客户端的消息: ${event.data}`)
          ws.send('来自服务器的问候！')
        },
        onClose: () => {
          console.log('连接已关闭')
        },
      }
    })
  )

  return {
    injectWebSocket
  }
}