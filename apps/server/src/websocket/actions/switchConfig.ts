import { updateRuntimeConfig } from '../../config';
import { enhancedBrowserAgent } from '../../mastra/agents/enhanced-browser-agent';
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

/**
 * 创建配置切换处理器
 */
export function createSwitchConfigHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info({ connectionId, payload }, '收到配置切换请求');

    try {
      const { params } = payload;

      if (!params) {
        throw new Error('缺少配置参数');
      }

      // 更新运行时配置和环境变量
      updateRuntimeConfig(params);

      // 重新初始化增强浏览器助手，以应用新配置
      wsLogger.info({ connectionId }, '正在重新初始化增强浏览器助手...');
      await enhancedBrowserAgent.reinitialize();

      const response = createSuccessResponse(
        message as WebSocketMessage,
        '配置切换成功并已重新初始化 Agent',
      );
      send(response);

      wsLogger.info({ connectionId }, '配置切换完成');
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error: error instanceof Error ? error.message : String(error),
          messageId: meta?.messageId,
        },
        '配置切换失败',
      );

      const response = createErrorResponse(
        message as WebSocketMessage,
        error instanceof Error ? error.message : '配置切换失败',
        'SWITCH_CONFIG_ERROR',
      );
      send(response);
    }
  };
}
