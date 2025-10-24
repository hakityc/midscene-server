/**
 * Windows 客户端 WebSocket 通信协议定义
 */

// ==================== 基础消息类型 ====================

/**
 * 基础消息结构
 */
export interface WindowsWSMessage {
  /** 消息ID（UUID） */
  id: string;
  /** 消息类型 */
  type: 'request' | 'response' | 'event' | 'ping' | 'pong';
  /** 时间戳 */
  timestamp: number;
}

// ==================== 请求消息 ====================

/**
 * 操作类型
 */
export type WindowsAction =
  // 基础操作
  | 'screenshot'
  | 'getScreenSize'
  | 'mouseClick'
  | 'mouseDoubleClick'
  | 'mouseRightClick'
  | 'mouseHover'
  | 'mouseDrag'
  | 'typeText'
  | 'keyPress'
  | 'scroll'
  // 窗口管理
  | 'getWindowList'
  | 'activateWindow'
  | 'getActiveWindow'
  // 剪贴板
  | 'getClipboard'
  | 'setClipboard'
  // 连接管理
  | 'register'
  | 'getStatus';

/**
 * 请求消息（Server -> Client）
 */
export interface WindowsWSRequest extends WindowsWSMessage {
  type: 'request';
  /** 操作类型 */
  action: WindowsAction;
  /** 操作参数 */
  params: any;
  /** 超时时间（ms），默认10秒 */
  timeout?: number;
}

// ==================== 响应消息 ====================

/**
 * 响应消息（Client -> Server）
 */
export interface WindowsWSResponse extends WindowsWSMessage {
  type: 'response';
  /** 对应的请求ID */
  requestId: string;
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: any;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

// ==================== 事件消息 ====================

/**
 * 事件消息（Client -> Server，主动上报）
 */
export interface WindowsWSEvent extends WindowsWSMessage {
  type: 'event';
  /** 事件类型 */
  event: string;
  /** 事件数据 */
  data: any;
}

// ==================== 心跳消息 ====================

/**
 * Ping 消息
 */
export interface WindowsWSPing extends WindowsWSMessage {
  type: 'ping';
}

/**
 * Pong 消息
 */
export interface WindowsWSPong extends WindowsWSMessage {
  type: 'pong';
}

// ==================== 注册消息 ====================

/**
 * 客户端注册信息
 */
export interface ClientRegistrationData {
  /** 机器名 */
  machineName: string;
  /** 操作系统信息 */
  os: string;
  /** IP 地址 */
  ip?: string;
  /** 客户端支持的能力 */
  capabilities: WindowsAction[];
  /** 客户端版本 */
  version?: string;
}

/**
 * 注册响应
 */
export interface ClientRegistrationResponse {
  /** 客户端ID */
  clientId: string;
  /** 服务器时间 */
  serverTime: number;
}

// ==================== 操作参数类型 ====================

/**
 * 鼠标点击参数
 */
export interface MouseClickParams {
  x: number;
  y: number;
}

/**
 * 鼠标拖拽参数
 */
export interface MouseDragParams {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/**
 * 输入文本参数
 */
export interface TypeTextParams {
  text: string;
}

/**
 * 按键参数
 */
export interface KeyPressParams {
  key: string;
  modifiers?: string[]; // 'control', 'shift', 'alt', 'meta'
}

/**
 * 滚动参数
 */
export interface ScrollParams {
  x?: number;
  y?: number;
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
}

/**
 * 激活窗口参数
 */
export interface ActivateWindowParams {
  windowHandle: string;
}

/**
 * 设置剪贴板参数
 */
export interface SetClipboardParams {
  text: string;
}

// ==================== 返回数据类型 ====================

/**
 * 窗口信息
 */
export interface WindowInfo {
  /** 窗口句柄 */
  handle: string;
  /** 窗口标题 */
  title: string;
  /** 进程ID */
  processId: number;
  /** 是否为活动窗口 */
  isActive: boolean;
}

/**
 * 客户端状态
 */
export interface ClientStatus {
  /** 客户端ID */
  clientId: string;
  /** 机器名 */
  machineName: string;
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'busy';
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 活动请求数 */
  activeRequests: number;
  /** 总处理请求数 */
  totalRequests: number;
  /** 连接时长（ms） */
  uptime: number;
}

// ==================== 辅助类型 ====================

/**
 * 所有可能的消息类型联合
 */
export type AnyWindowsWSMessage =
  | WindowsWSRequest
  | WindowsWSResponse
  | WindowsWSEvent
  | WindowsWSPing
  | WindowsWSPong;
