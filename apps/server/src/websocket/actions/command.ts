import { WebOperateServiceRefactored } from '../../services/base/WebOperateServiceRefactored';
import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createCommandMessage,
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
    } catch (error: any) {
      wsLogger.error(
        { error, messageId: message.meta.messageId },
        '服务命令执行失败',
      );

      // 检查是否需要发送重启指令
      if (error?.restartRequired === true) {
        const errorMessage =
          error?.message || '浏览器连接失败，已达到最大重连次数';
        const restartCommandData = JSON.stringify({
          command: 'restart',
          reason: 'max_reconnect_attempts_reached',
          error: errorMessage,
          timestamp: Date.now(),
        });
        const restartMessage = createCommandMessage(
          message,
          restartCommandData,
        );
        send(restartMessage);
        wsLogger.info(
          { messageId: message.meta.messageId, errorMessage },
          '已发送重启指令给客户端',
        );
      }

      const response = createErrorResponse(message, error, '服务命令执行失败');
      send(response);
    }
  };
};
