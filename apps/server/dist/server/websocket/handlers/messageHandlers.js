import { WebSocketAction } from "../../utils/enums.js";
import { createConnectTabHandler } from "../actions/connect.js";
import { createDownloadVideoHandler } from "../actions/downloadVideo.js";
import { createAiHandler } from "../actions/execute.js";
import { executeScriptHandler } from "../actions/executeScript.js";
import { handleSiteScriptHandler } from "../actions/siteScript.js";
import { createCommandHandler } from "../actions/command.js";
// 创建所有消息处理器 - 支持部分WebSocketAction
export function createMessageHandlers() {
    return {
        [WebSocketAction.CONNECT_TAB]: createConnectTabHandler(),
        [WebSocketAction.AI]: createAiHandler(),
        // [WebSocketAction.AGENT]: createAgentExecuteHandler(),
        [WebSocketAction.AI_SCRIPT]: executeScriptHandler(),
        // [WebSocketAction.CALLBACK]: async () => {},
        // [WebSocketAction.ERROR]: async () => {},
        [WebSocketAction.DOWNLOAD_VIDEO]: createDownloadVideoHandler(),
        [WebSocketAction.DOWNLOAD_VIDEO_CALLBACK]: async () => { },
        [WebSocketAction.SITE_SCRIPT]: handleSiteScriptHandler(),
        [WebSocketAction.COMMAND]: createCommandHandler(),
    };
}
