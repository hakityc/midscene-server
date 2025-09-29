import { OperateService } from "../../services/operateService.js";
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder.js";
import { wsLogger } from "../../utils/logger.js";
import { WebSocketAction } from "../../utils/enums.js";
// 请求处理器
export function handleSiteScriptHandler() {
    return async ({ send }, message) => {
        const { payload } = message;
        try {
            wsLogger.info(message, "处理站点脚本请求");
            const operateService = OperateService.getInstance();
            const data = await operateService.evaluateJavaScript(payload.params, payload.originalCmd);
            console.log('脚本执行结果:', data);
            wsLogger.info(data, "处理站点脚本请求完成");
            const response = createSuccessResponse(message, `处理完成`, WebSocketAction.SITE_SCRIPT);
            send(response);
        }
        catch (error) {
            wsLogger.error(error, "处理站点脚本请求失败");
            const response = createErrorResponse(message, error, "处理失败");
            send(response);
        }
    };
}
