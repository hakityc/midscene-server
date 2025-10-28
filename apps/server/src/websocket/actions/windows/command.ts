import { WindowsOperateService } from '../../../services/windowsOperateService';
import type { MessageHandler } from '../../../types/websocket';
import { wsLogger } from '../../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../builders/messageBuilder';

enum Command {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  ENABLE_DEBUG = 'enableDebug',
  DISABLE_DEBUG = 'disableDebug',
}

/**
 * Windows 端命令处理器
 * 用于处理 Windows 客户端的服务命令
 */
export const createWindowsCommandHandler = (): MessageHandler => {
  return async ({ send }, message) => {
    try {
      const { meta, payload } = message;
      const command = payload.params as Command;
      const windowsOperateService = WindowsOperateService.getInstance();

      wsLogger.info(
        {
          ...meta,
          action: payload.action,
          clientType: 'windows',
        },
        '执行 Windows 服务命令',
      );

      switch (command) {
        case Command.START:
          await windowsOperateService.start();
          wsLogger.info('Windows 服务已启动');
          break;
        case Command.STOP:
          await windowsOperateService.stop();
          wsLogger.info('Windows 服务已停止');
          break;
        case Command.RESTART:
          await windowsOperateService.stop();
          await windowsOperateService.start();
          wsLogger.info('Windows 服务已重启');
          break;
        case Command.ENABLE_DEBUG:
          await windowsOperateService.enableDebug();
          wsLogger.info('Windows 服务 Debug 模式已启用');
          break;
        case Command.DISABLE_DEBUG:
          await windowsOperateService.disableDebug();
          wsLogger.info('Windows 服务 Debug 模式已禁用');
          break;
      }

      wsLogger.info(
        { messageId: message.meta.messageId },
        'Windows 服务命令执行成功',
      );
      const response = createSuccessResponse(
        message,
        `Windows 服务命令执行成功: ${command}`,
      );
      send(response);
    } catch (error) {
      wsLogger.error(
        { error, messageId: message.meta.messageId },
        'Windows 服务命令执行失败',
      );
      const response = createErrorResponse(
        message,
        error,
        'Windows 服务命令执行失败',
      );
      send(response);
    }
  };
};
