import { WebOperateService } from "../../services/webOperateService"
import type { MessageHandler } from "../../types/websocket"
import { wsLogger } from "../../utils/logger"
import { createErrorResponse, createSuccessResponse, createSuccessResponseWithMeta } from "../builders/messageBuilder"
import { ClientCommandHelper } from "../helpers/clientCommandHelper"
import { formatTaskTip, getTaskStageDescription } from "../../utils/taskTipFormatter"
import { WebSocketAction } from "../../utils/enums"
import yaml from "yaml"

// AI 请求处理器
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message
    const maskController = new ClientCommandHelper(message, send)
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

    const webOperateService = WebOperateService.getInstance()

    // 使用封装好的方法创建任务提示回调
    const taskTipCallback = webOperateService.createTaskTipCallback({
      send,
      message,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      formatTaskTip,
      getTaskStageDescription,
      WebSocketAction
    })

    try {
      // 注册任务提示回调
      webOperateService.onTaskTip(taskTipCallback)

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

      try {
        await maskController.executeWithMask(async () => {
          await webOperateService.executeScript(script)
        },{
          enabled: payload.option?.includes('LOADING_SHADE')
        })

        const response = createSuccessResponse(message, `AI 处理完成`)
        send(response)
      } finally {
        // 清理回调，避免内存泄漏
        webOperateService.offTaskTip(taskTipCallback)
      }
    } catch (error) {
      // 清理回调，避免内存泄漏
      try {
        const webOperateService = WebOperateService.getInstance()
        webOperateService.offTaskTip(taskTipCallback)
      } catch (cleanupError) {
        // 忽略清理错误
        console.warn("清理回调时出错:", cleanupError)
      }

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
