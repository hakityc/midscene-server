import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { ErrorCategory } from '../../utils/logFields';
import { logErrorWithCategory, wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../builders/messageBuilder';
import { ClientCommandHelper } from '../helpers/clientCommandHelper';
import { detectBusinessError } from '../utils/businessErrorDetector';
import { parseScriptParams } from '../utils/scriptParamsParser';
import { TaskLockKey, taskExecutionGuard } from '../utils/taskExecutionGuard';

// AI 请求处理器
export function executeScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const maskController = new ClientCommandHelper(message, send);
    // 提示：如果需要更多客户端控制功能（如 loading、toast、高亮等），
    // 可以使用 createClientCommandHelper(message, send)

    wsLogger.info(message, '处理 AI 请求');

    const acquireResult = taskExecutionGuard.tryAcquire(
      TaskLockKey.WEB,
      message,
    );
    if (!acquireResult.acquired) {
      const busyAction = acquireResult.current?.action || '进行中的任务';
      const response = createErrorResponse(
        message,
        new Error(`当前有任务执行中（${busyAction}），请稍后再试`),
        '任务排队中',
      );
      send(response);
      return;
    }

    const webOperateService = WebOperateServiceRefactored.getInstance();

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
        // 从 payload 中提取 context（如果存在）
        const context = payload?.context || '';

        await webOperateService.setAiContext(context);
        await maskController.executeWithMask(
          async () => {
            scriptResult = await webOperateService.executeScript(script);
            console.log(
              '🚀 AI 处理完成，返回结果:',
              JSON.stringify(scriptResult),
            );
          },
          {
            enabled: payload.option?.includes('LOADING_SHADE'),
          },
        );

        // 将执行结果返回给客户端，包含错误信息（如果有）
        const hasErrors = scriptResult?._hasErrors || false;
        const taskErrors = scriptResult?._taskErrors || [];

        // 使用工具函数检测业务错误
        const {
          hasError: hasBusinessError,
          errorMsg: businessErrorMsg,
          rawResult: businessErrorRaw,
        } = detectBusinessError(scriptResult?.result);

        if (hasBusinessError) {
          // 上报业务错误到 CLS
          logErrorWithCategory(
            wsLogger,
            new Error(businessErrorMsg), // 创建业务错误对象
            ErrorCategory.MIDSCENE_EXECUTION, // 使用执行错误分类
            {
              ...message.meta, // 包含 traceId 等元数据
              action: payload.action,
              businessError: true, // 标记为业务错误
              rawResult: businessErrorRaw, // 记录原始结果
            },
          );
        }

        let responseMessage = `${payload.action} 处理完成`;
        if (hasErrors && taskErrors.length > 0) {
          const errorSummary = taskErrors
            .map((err: any) => `${err.taskName}: ${err.error.message}`)
            .join('; ');
          responseMessage += ` (⚠️ 部分任务执行失败: ${errorSummary})`;
        } else if (hasBusinessError) {
          responseMessage += ` (⚠️ 业务逻辑执行失败: ${businessErrorMsg})`;
        }

        const response = createSuccessResponse(message, {
          message: responseMessage,
          result: scriptResult?.result,
          hasErrors: hasErrors || hasBusinessError, // 将业务错误也视为错误状态
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
    } finally {
      taskExecutionGuard.release(TaskLockKey.WEB, meta.messageId);
    }
  };
}
