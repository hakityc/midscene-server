import yaml from 'yaml';
import { WindowsOperateService } from '../../../services/windowsOperateService';
import type { MessageHandler } from '../../../types/websocket';
import { WebSocketAction } from '../../../utils/enums';
import { wsLogger } from '../../../utils/logger';
import {
  formatTaskTip,
  getTaskStageDescription,
} from '../../../utils/taskTipFormatter';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../../builders/messageBuilder';

/**
 * Windows 端 AI 脚本执行处理器
 * 用于处理 Windows 客户端的脚本执行
 */
export function executeWindowsScriptHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'windows_ai_script',
        clientType: 'windows',
      },
      '处理 Windows AI 脚本请求',
    );

    const windowsOperateService = WindowsOperateService.getInstance();

    // 使用封装好的方法创建任务提示回调
    const taskTipCallback = windowsOperateService.createTaskTipCallback({
      send,
      message,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      formatTaskTip,
      getTaskStageDescription,
      WebSocketAction,
    });

    try {
      // 注册任务提示回调
      windowsOperateService.onTaskTip(taskTipCallback);

      const rawParams = payload?.params as unknown;
      let parsedParams: unknown = rawParams;

      if (typeof rawParams === 'string') {
        try {
          // 如果是字符串，优先按 JSON 解析
          parsedParams = JSON.parse(rawParams);
        } catch {
          // 忽略解析错误，保持原始字符串
          parsedParams = rawParams;
        }
      }

      const script = yaml.stringify(parsedParams);

      wsLogger.info(
        {
          connectionId,
          messageId: meta.messageId,
          scriptLength: script.length,
        },
        'Windows 脚本内容',
      );

      let scriptResult: any;
      try {
        // 执行 Windows 脚本
        scriptResult = await windowsOperateService.executeScript(
          script,
          payload.originalCmd,
        );
        console.log('🚀 Windows AI 脚本处理完成，返回结果:', scriptResult);

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
      } catch (error) {
        wsLogger.error(
          {
            connectionId,
            error,
            messageId: meta.messageId,
          },
          'Windows AI 脚本执行失败',
        );
        throw error;
      } finally {
        // 清理回调，避免内存泄漏
        windowsOperateService.offTaskTip(taskTipCallback);
      }
    } catch (error) {
      // 清理回调，避免内存泄漏
      try {
        const windowsOperateService = WindowsOperateService.getInstance();
        windowsOperateService.offTaskTip(taskTipCallback);
      } catch (cleanupError) {
        // 忽略清理错误
        console.warn('清理回调时出错:', cleanupError);
      }

      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'Windows AI 脚本处理失败',
      );
      const response = createErrorResponse(
        message,
        error,
        'Windows AI 脚本处理失败',
      );
      send(response);
    }
  };
}
