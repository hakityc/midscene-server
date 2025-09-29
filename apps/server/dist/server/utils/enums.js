export var WebSocketAction;
(function (WebSocketAction) {
    WebSocketAction["CONNECT_TAB"] = "connectTab";
    WebSocketAction["AI"] = "ai";
    WebSocketAction["CALLBACK_AI_STEP"] = "aiCallbackStep";
    WebSocketAction["AGENT"] = "agent";
    WebSocketAction["AI_SCRIPT"] = "aiScript";
    WebSocketAction["CALLBACK"] = "callback";
    WebSocketAction["ERROR"] = "error";
    WebSocketAction["DOWNLOAD_VIDEO"] = "downloadVideo";
    WebSocketAction["DOWNLOAD_VIDEO_CALLBACK"] = "downloadVideoCallback";
    WebSocketAction["SITE_SCRIPT"] = "siteScript";
    WebSocketAction["COMMAND"] = "command";
})(WebSocketAction || (WebSocketAction = {}));
