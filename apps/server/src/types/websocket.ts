import type { WebSocketAction } from '../utils/enums';

export type WebSocketClient = any;

// 入站消息（客户端 -> 服务端）
export interface WsInboundMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
}

export interface WsInboundMessage<P = unknown> {
  meta: WsInboundMeta;
  payload: {
    action: WebSocketAction | string;
    params: P;
    site:string;
    originalCmd: string;
    option?: string;
  };
}

// 出站消息（服务端 -> 客户端）
export type WsStatus = 'success' | 'failed';

export interface WsOutboundMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
}

export interface WsOutboundMessage<R = unknown> {
  meta: WsOutboundMeta;
  payload: {
    action: WebSocketAction | string;
    status: WsStatus;
    result?: R;
    error?: string;
  };
}

// 兼容别名，便于迁移期引用不改动文件名
export type WebSocketMessage = WsInboundMessage<string>;

// 消息处理器上下文
export interface MessageHandlerContext {
  connectionId: string;
  ws: WebSocketClient;
  send: (message: WsOutboundMessage<any>) => boolean;
}

// 消息处理器类型
export type MessageHandler<P = string> = (
  ctx: MessageHandlerContext,
  message: WsInboundMessage<P>,
) => Promise<void>;
