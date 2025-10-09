import { WebOperateService } from "../../services/webOperateService"
import type { MessageHandler } from "../../types/websocket"
import { wsLogger } from "../../utils/logger"
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder"
import { createMaskController } from "../helpers/clientCommandHelper"
import yaml from "yaml"

// AI 请求处理器
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message
    const maskController = createMaskController(message, send, payload.option?.includes('LOADING_SHADE'))
    // 提示：如果需要更多客户端控制功能（如 loading、toast、高亮等），
    // 可以使用 createClientCommandHelper(message, send)

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: "ai_request",
      },
      "处理 AI 请求"
    )

    try {
      const webOperateService = WebOperateService.getInstance()
      const rawParams = payload?.params as unknown
      let parsedParams: unknown = rawParams

      if (typeof rawParams === "string") {
        try {
          // 如果是字符串，优先按 JSON 解析，处理形如 "{\n  \"tasks\": ... }" 的转义内容
          parsedParams = JSON.parse(rawParams)
        } catch {
          // 忽略解析错误，保持原始字符串（可能是已是 YAML 或普通文本）
          parsedParams = rawParams
        }
      }

      const script = yaml.stringify(parsedParams)

      // 方式1：手动控制遮罩
      // maskController.start()
      // await webOperateService.executeScript(script)
      // maskController.stop()

      // 方式2：自动控制遮罩（推荐，自动处理异常情况）
      await maskController.withMask(async () => {
        await webOperateService.executeScript(script)
      })

      const response = createSuccessResponse(message, `AI 处理完成`)
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
      const response = createErrorResponse(message, error, "AI 处理失败")
      send(response)
    }
  }
}
