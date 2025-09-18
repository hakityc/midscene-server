import { OperateService } from "../../services/operateService"
import type { MessageHandler } from "../../types/websocket"
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder"
import { wsLogger } from "../../utils/logger"

// 请求处理器
export function handleSiteScriptHandler(): MessageHandler {
  return async ({ send }, message) => {
    const { payload } = message
    try {
      wsLogger.info(message, "处理站点脚本请求")
      const operateService = OperateService.getInstance()
      const data = await operateService.evaluateJavaScript(payload.params)
      console.log('脚本执行结果:', data)
      wsLogger.info(data, "处理站点脚本请求完成")
      if (data.result.subtype === "error") {
        throw new Error(data.result.description)
      }
      if(data.result.type === 'undefined'){
        throw new Error('脚本执行结果为undefined')
      }
      const response = createSuccessResponse(message, `处理完成`)
      send(response)
    } catch (error) {
      wsLogger.error(message, "处理站点脚本请求失败")
      const response = createErrorResponse(message, error, "处理失败")
      send(response)
    }
  }
}
