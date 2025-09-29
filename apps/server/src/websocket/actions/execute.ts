import { OperateService } from "../../services/operateService"
import type { MessageHandler, WebSocketMessage } from "../../types/websocket"
import { wsLogger } from "../../utils/logger"
import { createErrorResponse, createSuccessResponse, createSuccessResponseWithMeta } from "../builders/messageBuilder"
import { formatTaskTip, getTaskStageDescription } from "../../utils/taskTipFormatter"
import { WebSocketAction } from "../../utils/enums"

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
      
      // 检查连接状态
      const isConnected = await operateService.checkAndReconnect()
      if (!isConnected) {
        const response = createErrorResponse(
          message as WebSocketMessage, 
          new Error("Agent连接已断开，正在尝试重连中，请稍后重试"), 
          "Agent连接断开"
        )
        send(response)
        return
      }

      // 监听重连事件
      const onReconnected = () => {
        const response = createSuccessResponse(
          message as WebSocketMessage, 
          "Agent重连成功，可以继续操作", 
          WebSocketAction.CALLBACK_AI_STEP
        )
        send(response)
      }
      
      operateService.once('reconnected', onReconnected)

      operateService.on("taskStartTip", (tip: string) => {
        // 格式化任务提示
        const { formatted, icon, category } = formatTaskTip(tip)
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })

        console.log(`🎯 WebSocket 监听到任务提示: ${tip}`)
        // console.log(`📝 格式化后的用户友好提示: ${formatted}`)

        // 发送格式化后的用户友好消息
        const response = createSuccessResponseWithMeta(
          message as WebSocketMessage,
          formatted,
          {
            originalTip: tip,
            category,
            icon,
            timestamp,
            stage: getTaskStageDescription(category)
          },
          WebSocketAction.CALLBACK_AI_STEP
        )
        send(response)
      })
      await operateService.execute(params)
      const response = createSuccessResponse(message as WebSocketMessage, `AI 处理完成`, WebSocketAction.AI)
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
      // 检查是否是连接错误
      const errorMessage = (error as Error).message || ""
      if (errorMessage.includes("连接") || errorMessage.includes("timeout")) {
        const response = createErrorResponse(
          message as WebSocketMessage, 
          error, 
          "连接错误，正在尝试重连"
        )
        send(response)
      } else {
        const response = createErrorResponse(message as WebSocketMessage, error, "AI 处理失败")
        send(response)
      }
    }
  }
}
