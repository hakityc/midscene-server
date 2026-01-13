import type { ClientType, MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { createSwitchConfigHandler } from '../actions/switchConfig';
// Web 端 Actions
import {
  createConnectTabHandler,
  createDownloadVideoHandler,
  createSummarizeHandler,
  createAiHandler as createWebAiHandler,
  createCommandHandler as createWebCommandHandler,
  executeScriptHandler as executeWebScriptHandler,
  handleSiteScriptHandler,
} from '../actions/web';
// Windows 端 Actions
import {
  createConnectWindowHandler,
  createWindowsAiHandler,
  createWindowsCommandHandler,
  executeTestHandler,
  executeWindowsScriptHandler,
} from '../actions/windows';

/**
 * 创建 Web 端消息处理器
 * Web 端支持完整的浏览器操作功能
 */
export function createWebMessageHandlers(): Partial<
  Record<WebSocketAction, MessageHandler>
> {
  return {
    [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(),
    [WebSocketAction.AI]: createWebAiHandler(),
    [WebSocketAction.AI_SCRIPT]: executeWebScriptHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO]: createDownloadVideoHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO_CALLBACK]: async () => {},
    [WebSocketAction.SITE_SCRIPT]: handleSiteScriptHandler(),
    [WebSocketAction.COMMAND]: createWebCommandHandler(),
    [WebSocketAction.SUMMARIZE]: createSummarizeHandler(),
    [WebSocketAction.SWITCH_CONFIG]: createSwitchConfigHandler(),
  };
}

/**
 * 创建 Windows 端消息处理器
 * Windows 端支持基本的 AI 操作和命令
 */
export function createWindowsMessageHandlers(): Partial<
  Record<WebSocketAction, MessageHandler>
> {
  return {
    [WebSocketAction.CONNECT_WINDOW]: createConnectWindowHandler(),
    [WebSocketAction.AI]: createWindowsAiHandler(),
    [WebSocketAction.AI_SCRIPT]: executeWindowsScriptHandler(),
    [WebSocketAction.COMMAND]: createWindowsCommandHandler(),
    [WebSocketAction.TEST]: executeTestHandler(),
    [WebSocketAction.SWITCH_CONFIG]: createSwitchConfigHandler(),
  };
}

// 创建统一的消息处理器工厂
// 根据消息的 clientType 返回相应的 handler
export function createMessageHandlers() {
  const webHandlers = createWebMessageHandlers();
  const windowsHandlers = createWindowsMessageHandlers();

  // 返回一个代理对象，根据 clientType 动态选择处理器
  return new Proxy({} as Partial<Record<WebSocketAction, MessageHandler>>, {
    get(_target, action: string | symbol) {
      // 返回一个包装后的 handler
      return async (ctx: any, message: any) => {
        // 获取客户端类型，默认为 web
        const clientType: ClientType = message?.meta?.clientType || 'web';

        // 根据客户端类型选择对应的 handlers
        const handlers =
          clientType === 'windows' ? windowsHandlers : webHandlers;
        const handler = handlers[action as WebSocketAction];

        if (handler) {
          await handler(ctx, message);
        }
      };
    },
  });
}
