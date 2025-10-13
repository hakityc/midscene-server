import fs from 'node:fs';
import path from 'node:path';
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
    const { meta } = message;

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
    windowsOperateService.start();
    try {
      let scriptResult: string;
      try {
        // 执行 Windows 脚本
        scriptResult = await windowsOperateService.screenshot();

        // 将截图保存到临时文件夹以便验证
        if (scriptResult) {
          const tempDir = path.join(process.cwd(), 'midscene_run', 'output');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotPath = path.join(
            tempDir,
            `windows-screenshot-${timestamp}.png`,
          );

          // 从 base64 保存为图片文件
          const base64Data = scriptResult.replace(
            /^data:image\/\w+;base64,/,
            '',
          );
          fs.writeFileSync(screenshotPath, Buffer.from(base64Data, 'base64'));

          wsLogger.info({ screenshotPath }, 'Windows 截图已保存');
        }

        const response = createSuccessResponse(message, {
          message: '截图处理完成',
          screenshotSaved: true,
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
