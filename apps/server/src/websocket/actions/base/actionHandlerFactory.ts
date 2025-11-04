/**
 * Action Handler 工厂函数
 *
 * 消除 Web 和 Windows Action Handlers 之间的代码重复
 * 通过工厂函数生成统一的处理器，只需提供服务实例即可
 */

import type { BaseOperateService } from '../../../services/base/BaseOperateService';
import type {
  MessageHandler,
  WebSocketMessage,
} from '../../../types/websocket';
import { WebSocketAction } from '../../../utils/enums';
import { wsLogger } from '../../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
  createSuccessResponseWithMeta,
} from '../../builders/messageBuilder';
import { ClientCommandHelper } from '../../helpers/clientCommandHelper';

/**
 * 创建 AI 请求处理器的工厂函数
 *
 * @param service - 操作服务实例（WebOperateService 或 WindowsOperateService）
 * @param serviceName - 服务名称（用于日志）
 * @param options - 可选配置
 * @returns MessageHandler
 */
export function createAiHandlerFactory(
  getService: () => BaseOperateService<any>,
  serviceName: string,
  options?: {
    /** 是否检查并重连（仅 Web 使用） */
    checkAndReconnect?: boolean;
    /** 是否支持遮罩功能（Loading Shade） */
    supportMask?: boolean;
  },
): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const service = getService();

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'ai_request',
        service: serviceName,
        params: payload?.params,
        option: payload?.option,
      },
      `处理 ${serviceName} AI 请求`,
    );

    // 创建任务提示回调
    const taskTipCallback = service.createTaskTipCallback({
      send,
      message: message as WebSocketMessage,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      WebSocketAction,
    });

    try {
      const params = payload.params;

      // Web 服务需要检查连接状态
      if (options?.checkAndReconnect && 'checkAndReconnect' in service) {
        const isConnected = await (service as any).checkAndReconnect();
        if (!isConnected) {
          const response = createErrorResponse(
            message as WebSocketMessage,
            new Error('Agent连接已断开，正在尝试重连中，请稍后重试'),
            'Agent连接断开',
          );
          send(response);
          return;
        }

        // 监听重连事件
        const onReconnected = () => {
          const response = createSuccessResponse(
            message as WebSocketMessage,
            'Agent重连成功，可以继续操作',
            WebSocketAction.CALLBACK_AI_STEP,
          );
          send(response);
        };
        service.once('reconnected', onReconnected);
      }

      // 注册任务提示回调
      service.onTaskTip(taskTipCallback);

      try {
        // 执行 AI 任务（支持遮罩功能）
        if (options?.supportMask) {
          const maskController = new ClientCommandHelper(message, send);
          await maskController.executeWithMask(
            async () => {
              await service.execute(params);
            },
            {
              enabled: payload.option?.includes('LOADING_SHADE'),
            },
          );
        } else {
          await service.execute(params);
        }

        const response = createSuccessResponse(
          message as WebSocketMessage,
          `${serviceName} AI 处理完成`,
          WebSocketAction.AI,
        );
        send(response);
      } finally {
        // 清理回调，避免内存泄漏
        service.offTaskTip(taskTipCallback);
      }
    } catch (error) {
      // 清理回调
      try {
        const service = getService();
        service.offTaskTip(taskTipCallback);
      } catch (cleanupError) {
        console.warn('清理回调时出错:', cleanupError);
      }

      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        `${serviceName} AI 处理失败`,
      );

      // 检查是否是连接错误
      const errorMessage = (error as Error).message || '';
      if (
        errorMessage.includes('连接') ||
        errorMessage.includes('connect') ||
        errorMessage.includes('timeout')
      ) {
        const response = createErrorResponse(
          message as WebSocketMessage,
          error,
          '连接错误，正在尝试重连',
        );
        send(response);
      } else {
        const response = createErrorResponse(
          message as WebSocketMessage,
          error,
          `${serviceName} AI 处理失败`,
        );
        send(response);
      }
    }
  };
}

/**
 * 创建脚本执行处理器的工厂函数
 *
 * @param getService - 操作服务实例获取函数
 * @param serviceName - 服务名称
 * @returns MessageHandler
 */
export function createScriptHandlerFactory(
  getService: () => BaseOperateService<any>,
  serviceName: string,
): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const service = getService();

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: 'script_execution',
        service: serviceName,
        script: payload?.params,
        originalCmd: payload?.originalCmd,
      },
      `处理 ${serviceName} 脚本执行请求`,
    );

    // 创建任务提示回调
    const taskTipCallback = service.createTaskTipCallback({
      send,
      message: message as WebSocketMessage,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta: createSuccessResponseWithMeta as any,
      createErrorResponse: createErrorResponse as any,
      WebSocketAction,
    });

    try {
      const script = payload.params;
      const originalCmd = payload.originalCmd;

      // 注册任务提示回调
      service.onTaskTip(taskTipCallback);

      try {
        const result = await service.executeScript(script, 3, originalCmd);

        const response = createSuccessResponse(
          message as WebSocketMessage,
          result,
          WebSocketAction.AI_SCRIPT,
        );
        send(response);
      } finally {
        // 清理回调
        service.offTaskTip(taskTipCallback);
      }
    } catch (error) {
      // 清理回调
      try {
        const service = getService();
        service.offTaskTip(taskTipCallback);
      } catch (cleanupError) {
        console.warn('清理回调时出错:', cleanupError);
      }

      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        `${serviceName} 脚本执行失败`,
      );

      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        `${serviceName} 脚本执行失败`,
      );
      send(response);
    }
  };
}

/**
 * 创建命令处理器的工厂函数（支持多种命令类型）
 *
 * @param getService - 操作服务实例获取函数
 * @param serviceName - 服务名称
 * @param commandHandlers - 命令处理器映射
 * @returns MessageHandler
 */
export function createCommandHandlerFactory(
  getService: () => BaseOperateService<any>,
  serviceName: string,
  commandHandlers: Record<string, (service: any, params: any) => Promise<any>>,
): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    const service = getService();

    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: payload.action,
        service: serviceName,
        command: payload?.action || payload?.params,
        params: payload?.params,
        option: payload?.option,
      },
      `处理 ${serviceName} 命令请求`,
    );

    try {
      const command = payload.action || payload.params;
      const params = payload.params;

      // 查找对应的命令处理器
      const handler = commandHandlers[command as string];
      if (!handler) {
        throw new Error(`未知命令: ${command}`);
      }

      // 执行命令
      const result = await handler(service, params);

      const response = createSuccessResponse(
        message as WebSocketMessage,
        result,
        WebSocketAction.COMMAND,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
          action: payload.action,
        },
        `${serviceName} 命令执行失败`,
      );

      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        `${serviceName} 命令执行失败`,
      );
      send(response);
    }
  };
}

/**
 * 通用的比较函数：比较重构前后的代码行数减少
 */
export function getCodeReductionStats(
  originalLinesOfCode: number,
  refactoredLinesOfCode: number,
): {
  reduction: number;
  percentage: string;
} {
  const reduction = originalLinesOfCode - refactoredLinesOfCode;
  const percentage = ((reduction / originalLinesOfCode) * 100).toFixed(1);

  return {
    reduction,
    percentage: `${percentage}%`,
  };
}
