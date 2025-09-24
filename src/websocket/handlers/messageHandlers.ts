import type { MessageHandler } from "../../types/websocket"
import { WebSocketAction } from "../../utils/enums"
import { createConnectTabHandler } from "../actions/connect"
import { createDownloadVideoHandler } from "../actions/downloadVideo"
import { createAiHandler } from "../actions/execute"
import { createAgentExecuteHandler } from "../actions/agentExecute"
import { executeScriptHandler } from "../actions/executeScript"
import { handleSiteScriptHandler } from "../actions/siteScript"
import { createCommandHandler } from "../actions/command"

// 创建所有消息处理器 - 支持部分WebSocketAction
export function createMessageHandlers(): Partial<Record<WebSocketAction, MessageHandler>> {
  return {
    [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(),
    [WebSocketAction.AI]: createAiHandler(),
    // [WebSocketAction.AGENT]: createAgentExecuteHandler(),
    [WebSocketAction.AI_SCRIPT]: executeScriptHandler(),
    // [WebSocketAction.CALLBACK]: async () => {},
    // [WebSocketAction.ERROR]: async () => {},
    [WebSocketAction.DOWNLOAD_VIDEO]: createDownloadVideoHandler(),
    [WebSocketAction.DOWNLOAD_VIDEO_CALLBACK]: async () => {},
    [WebSocketAction.SITE_SCRIPT]: handleSiteScriptHandler(),
    [WebSocketAction.COMMAND]: createCommandHandler(),
  }
}
