import type { WebSocketAction } from '../utils/enums';
// WebSocket 消息格式
export interface WebSocketMessage {
  message_id: string;
  conversation_id: string;
  content: {
    action: WebSocketAction;
    body: string;
  };
  timestamp: string;
}

export type WebSocketClient = any;

// 消息处理器上下文
export interface MessageHandlerContext {
  connectionId: string;
  ws: WebSocketClient;
  send: (message: WebSocketMessage) => boolean;
}

// 消息处理器类型
export type MessageHandler = (
  ctx: MessageHandlerContext,
  message: WebSocketMessage,
) => Promise<void>;
