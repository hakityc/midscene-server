import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

enum Command {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  ENABLE_RIPPLE = 'enableRipple',
  DISABLE_RIPPLE = 'disableRipple',
}

export const createCommandHandler = (): MessageHandler => {
  return async ({ send }, message) => {
    try {
      const { meta, payload } = message;
      const command = payload.params as Command;
      const webOperateService = WebOperateServiceRefactored.getInstance();
      wsLogger.info(
        {
          ...meta,
          action: payload.action,
        },
        '执行中转服务命令',
      );
      switch (command) {
        case Command.START:
          await webOperateService.start();
          break;
        case Command.STOP:
          await webOperateService.stop();
          break;
        case Command.ENABLE_RIPPLE:
          await webOperateService.setRippleEnabled(true);
          break;
        case Command.DISABLE_RIPPLE:
          await webOperateService.setRippleEnabled(false);
          break;
      }

      wsLogger.info({ messageId: message.meta.messageId }, '服务命令执行成功');
      const response = createSuccessResponse(message, `服务命令执行成功`);
      send(response);
    } catch (error) {
      wsLogger.error(
        { error, messageId: message.meta.messageId },
        '服务命令执行失败',
      );
      const response = createErrorResponse(message, error, '服务命令执行失败');
      send(response);
    }
  };
};
