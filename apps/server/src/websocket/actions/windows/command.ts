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
      
      wsLogger.info(
        {
          ...meta,
          action: payload.action,
          clientType: 'windows',
        },
        '执行 Windows 服务命令',
      );

      // TODO: 实现 Windows 特定的服务控制逻辑
      // 这里应该调用 Windows 特定的服务而不是 WebOperateService
      switch (command) {
        case Command.START:
          // await windowsOperateService.start();
          wsLogger.info('Windows 服务启动（待实现）');
          break;
        case Command.STOP:
          // await windowsOperateService.stop();
          wsLogger.info('Windows 服务停止（待实现）');
          break;
        case Command.RESTART:
          // await windowsOperateService.restart();
          wsLogger.info('Windows 服务重启（待实现）');
          break;
      }

      wsLogger.info({ messageId: message.meta.messageId }, 'Windows 服务命令执行成功');
      const response = createSuccessResponse(message, `Windows 服务命令执行成功`);
      send(response);
    } catch (error) {
      wsLogger.error(
        { error, messageId: message.meta.messageId },
        'Windows 服务命令执行失败',
      );
      const response = createErrorResponse(message, error, 'Windows 服务命令执行失败');
      send(response);
    }
  };
};

