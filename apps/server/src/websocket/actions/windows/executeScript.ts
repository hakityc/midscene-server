import yaml from 'yaml';
import type { MessageHandler } from '../../../types/websocket';
import { WebSocketAction } from '../../../utils/enums';
import { wsLogger } from '../../../utils/logger';
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

    try {
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

      // 发送处理进度
      const progressResponse = createSuccessResponseWithMeta(
        message,
        {
          stage: 'parsing',
          tip: '正在解析 Windows 脚本...',
        },
        WebSocketAction.CALLBACK_AI_STEP,
      );
      send(progressResponse);

      // TODO: 实现 Windows 特定的脚本执行逻辑
      // const windowsOperateService = WindowsOperateService.getInstance();
      // const scriptResult = await windowsOperateService.executeScript(script);

      // 模拟脚本执行
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const scriptResult = {
        result: {
          message: 'Windows 脚本执行完成（待实现）',
          script,
        },
        _hasErrors: false,
        _taskErrors: [],
      };

      // 将执行结果返回给客户端
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
