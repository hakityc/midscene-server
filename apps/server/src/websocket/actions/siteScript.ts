import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { ErrorCategory } from '../../utils/logFields';
import { logErrorWithCategory, wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';
import { detectBusinessError } from '../utils/businessErrorDetector';

// 请求处理器
export function handleSiteScriptHandler(): MessageHandler {
  return async ({ send }, message) => {
    const { payload } = message;
    try {
      wsLogger.info(message, '处理站点脚本请求');
      const webOperateService = WebOperateServiceRefactored.getInstance();
      const data = await webOperateService.evaluateJavaScript(
        payload.params,
        payload.originalCmd,
      );
      console.log('脚本执行结果:', data);

      // 检测业务错误
      const {
        hasError: hasBusinessError,
        errorMsg: businessErrorMsg,
        rawResult: businessErrorRaw,
      } = detectBusinessError(data);

      if (hasBusinessError) {
        // 上报业务错误到 CLS
        logErrorWithCategory(
          wsLogger,
          new Error(businessErrorMsg),
          ErrorCategory.MIDSCENE_EXECUTION,
          {
            ...message.meta,
            action: payload.action,
            businessError: true,
            rawResult: businessErrorRaw,
          },
        );
      }

      wsLogger.info(data, '处理站点脚本请求完成');

      let responseMessage = '处理完成';
      if (hasBusinessError) {
        responseMessage += ` (⚠️ 业务逻辑执行失败: ${businessErrorMsg})`;
      }

      // 返回结构化数据，包含执行结果和错误状态
      const response = createSuccessResponse(
        message,
        {
          message: responseMessage,
          result: data,
          hasErrors: hasBusinessError,
        },
        WebSocketAction.SITE_SCRIPT,
      );
      send(response);
    } catch (error) {
      wsLogger.error(error, '处理站点脚本请求失败');
      const response = createErrorResponse(message, error, '处理失败');
      send(response);
    }
  };
}
