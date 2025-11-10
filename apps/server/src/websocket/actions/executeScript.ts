import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../builders/messageBuilder';
import { ClientCommandHelper } from '../helpers/clientCommandHelper';
import { parseScriptParams } from '../utils/scriptParamsParser';

// AI 请求处理器
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const maskController = new ClientCommandHelper(message, send);
    // 提示：如果需要更多客户端控制功能（如 loading、toast、高亮等），
    // 可以使用 createClientCommandHelper(message, send)

    wsLogger.info(message, '处理 AI 请求');

    const webOperateService = WebOperateServiceRefactored.getInstance();

    //TODO 这里需要使用 leboStepName 来展示任务名称
    // 使用封装好的方法创建任务提示回调
    const taskTipCallback = webOperateService.createTaskTipCallback({
      send,
      message,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      WebSocketAction,
    });

    try {
      // 注册任务提示回调
      webOperateService.onTaskTip(taskTipCallback);

      const { script, stepMetadata } = parseScriptParams(payload?.params);

      // 设置步骤元数据到 service
      webOperateService.setStepMetadata(stepMetadata);

      let scriptResult: any;
      try {
        await maskController.executeWithMask(
          async () => {
            scriptResult = await webOperateService.executeScript(script);
            console.log('🚀 AI 处理完成，返回结果:', scriptResult);
          },
          {
            enabled: payload.option?.includes('LOADING_SHADE'),
          },
        );

        // 将执行结果返回给客户端，包含错误信息（如果有）
        const hasErrors = scriptResult?._hasErrors || false;
        const taskErrors = scriptResult?._taskErrors || [];

        let responseMessage = `${payload.action} 处理完成`;
        if (hasErrors && taskErrors.length > 0) {
          const errorSummary = taskErrors
            .map((err: any) => `${err.taskName}: ${err.error.message}`)
            .join('; ');
          responseMessage += ` (⚠️ 部分任务执行失败: ${errorSummary})`;
        }

        const response = createSuccessResponse(message, {
          message: responseMessage,
          result: scriptResult?.result,
          hasErrors,
          taskErrors: hasErrors ? taskErrors : undefined,
        });
        send(response);
      } finally {
        // 清理回调和元数据，避免内存泄漏
        webOperateService.offTaskTip(taskTipCallback);
        webOperateService.clearStepMetadata();
      }
    } catch (error) {
      // 清理回调，避免内存泄漏
      try {
        webOperateService.offTaskTip(taskTipCallback);
      } catch (cleanupError) {
        // 忽略清理错误
        console.warn('清理回调时出错:', cleanupError);
      }

      webOperateService.clearStepMetadata();

      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'AI 处理失败',
      );
      const response = createErrorResponse(message, error, 'AI 处理失败');
      send(response);
    }
  };
}
