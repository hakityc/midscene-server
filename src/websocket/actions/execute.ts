import { OperateService } from "../../services/operateService"
import type { MessageHandler, WebSocketMessage } from "../../types/websocket"
import { wsLogger } from "../../utils/logger"
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder"

// AI 请求处理器
export function createAiHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message
    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: "ai_request",
      },
      "处理 AI 请求"
    )

    try {
      const params = payload.params
      const operateService = OperateService.getInstance()
      operateService.on("taskStartTip", (tip: string) => {
        console.log(`🎯 WebSocket 监听到任务提示: ${tip}`)
        const response = createSuccessResponse(message as WebSocketMessage, `AI 分步骤处理: ${tip}`)
        send(response)
      })
      await operateService.execute(params)
      const response = createSuccessResponse(message as WebSocketMessage, `AI 处理完成`)
      send(response)
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        "AI 处理失败"
      )
      const response = createErrorResponse(message as WebSocketMessage, error, "AI 处理失败")
      send(response)
    }
  }
}
