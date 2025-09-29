import { OperateService } from '../../services/operateService.js';
import { wsLogger } from '../../utils/logger.js';
import { createErrorResponse, createSuccessResponse, } from '../builders/messageBuilder.js';
import yaml from 'yaml';
// AI 请求处理器
export function executeScriptHandler() {
    return async ({ connectionId, send }, message) => {
        const { meta, payload } = message;
        wsLogger.info({
            connectionId,
            messageId: meta.messageId,
            action: 'ai_request',
        }, '处理 AI 请求');
        try {
            const operateService = OperateService.getInstance();
            const rawParams = payload?.params;
            let parsedParams = rawParams;
            if (typeof rawParams === 'string') {
                try {
                    // 如果是字符串，优先按 JSON 解析，处理形如 "{\n  \"tasks\": ... }" 的转义内容
                    parsedParams = JSON.parse(rawParams);
                }
                catch {
                    // 忽略解析错误，保持原始字符串（可能是已是 YAML 或普通文本）
                    parsedParams = rawParams;
                }
            }
            const script = yaml.stringify(parsedParams);
            await operateService.executeScript(script);
            const response = createSuccessResponse(message, `AI 处理完成`);
            send(response);
        }
        catch (error) {
            wsLogger.error({
                connectionId,
                error,
                messageId: meta.messageId,
            }, 'AI 处理失败');
            const response = createErrorResponse(message, error, 'AI 处理失败');
            send(response);
        }
    };
}
