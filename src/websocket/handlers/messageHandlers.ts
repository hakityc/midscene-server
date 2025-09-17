import type { MessageHandler } from '../../types/websocket';
import { WebSocketAction } from '../../utils/enums';
import { createConnectTabHandler } from '../actions/connect';
import { createAiHandler } from '../actions/execute';
import { createDownloadVideoHandler } from '../actions/downloadVideo';
import { executeScriptHandler } from '../actions/executeScript';

// 创建所有消息处理器
export function createMessageHandlers(): Record<
  WebSocketAction,
  MessageHandler
> {
  return {
    [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(),
    [WebSocketAction.AI]: createAiHandler(),
    [WebSocketAction.AI_SCRIPT]: executeScriptHandler(),
    [WebSocketAction.CALLBACK]: async () => {},
    [WebSocketAction.ERROR]: async () => {},
    [WebSocketAction.DOWNLOAD_VIDEO]: createDownloadVideoHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO_CALLBACK]: async () => {},
  } as Record<WebSocketAction, MessageHandler>;
}
