import { WindowsOperateService } from '../../../services/windowsOperateService';
import type { MessageHandler } from '../../../types/websocket';
import { wsLogger } from '../../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../builders/messageBuilder';

/**
 * Windows 端 AI 脚本执行处理器
 * 用于处理 Windows 客户端的脚本执行
 */
export function executeTestHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'windows_test',
        clientType: 'windows',
      },
      '处理 Windows 测试请求',
    );

    const windowsOperateService = WindowsOperateService.getInstance();

    try {
      let scriptResult: any;
      try {
        // 执行 Windows 脚本
        scriptResult = await windowsOperateService.screenshot();
        wsLogger.info(scriptResult, 'Windows 脚本内容');

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
          'Windows 测试执行失败',
        );
        throw error;
      }
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'Windows 测试处理失败',
      );
      const response = createErrorResponse(
        message,
        error,
        'Windows 测试处理失败',
      );
      send(response);
    }
  };
}
