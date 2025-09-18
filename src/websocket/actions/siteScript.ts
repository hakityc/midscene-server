import type { MessageHandler } from "../../types/websocket"
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder"
import { OperateService } from "../../services/operateService"

// 请求处理器
export function handleSiteScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message
    try {
      const response = createSuccessResponse(message, `处理完成`)
      send(response)
    } catch (error) {
      const response = createErrorResponse(message, error, "处理失败")
      send(response)
    }
  }
}
