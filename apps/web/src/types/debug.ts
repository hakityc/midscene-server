// WebSocket Action 类型
export type WebSocketAction =
  | 'connectTab'
  | 'ai'
  | 'aiScript'
  | 'agent'
  | 'siteScript'
  | 'downloadVideo'
  | 'command';

// 消息元数据
export interface MessageMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
}

// Flow 动作类型
export type FlowActionType =
  | 'aiTap'
  | 'aiInput'
  | 'aiAssert'
  | 'sleep'
  | 'aiHover'
  | 'aiScroll'
  | 'aiWaitFor'
  | 'aiKeyboardPress';

// Flow 动作基础接口
export interface BaseFlowAction {
  type: FlowActionType;
}

// aiTap 动作
export interface AiTapAction extends BaseFlowAction {
  type: 'aiTap';
  locate?: string; // 描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiInput 动作
export interface AiInputAction extends BaseFlowAction {
  type: 'aiInput';
  value: string; // 输入内容
  locate: string; // 定位描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiAssert 动作
export interface AiAssertAction extends BaseFlowAction {
  type: 'aiAssert';
  assertion: string; // 断言描述
  errorMessage?: string; // 断言失败时的错误信息
  name?: string; // 断言名称，作为 JSON 输出的 key
}

// sleep 动作
export interface SleepAction extends BaseFlowAction {
  type: 'sleep';
  duration: number; // 延迟时间(ms)
}

// aiHover 动作
export interface AiHoverAction extends BaseFlowAction {
  type: 'aiHover';
  locate: string; // 定位描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiScroll 动作
export interface AiScrollAction extends BaseFlowAction {
  type: 'aiScroll';
  direction: 'up' | 'down' | 'left' | 'right'; // 滚动方向
  scrollType: 'once' | 'untilBottom' | 'untilTop' | 'untilLeft' | 'untilRight'; // 滚动类型
  distance?: number; // 滚动距离(像素)
  locate?: string; // 执行滚动的元素
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiWaitFor 动作
export interface AiWaitForAction extends BaseFlowAction {
  type: 'aiWaitFor';
  assertion: string; // 等待条件描述
  timeoutMs?: number; // 超时时间(ms)，默认 30000
  checkIntervalMs?: number; // 检查间隔(ms)
}

// aiKeyboardPress 动作
export interface AiKeyboardPressAction extends BaseFlowAction {
  type: 'aiKeyboardPress';
  key: string; // 按键名称
  locate?: string; // 定位描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// 联合类型
export type FlowAction =
  | AiTapAction
  | AiInputAction
  | AiAssertAction
  | SleepAction
  | AiHoverAction
  | AiScrollAction
  | AiWaitForAction
  | AiKeyboardPressAction;

// 任务定义
export interface Task {
  id: string;
  name: string;
  continueOnError: boolean;
  flow: FlowAction[];
}

// AI Script 参数
export interface AiScriptParams {
  tasks: Task[];
}

// 其他 Action 参数
export interface AiParams {
  prompt: string;
}

export interface SiteScriptParams {
  script: string;
  originalCmd?: string;
}

export interface DownloadVideoParams {
  url: string;
  savePath?: string;
}

// WebSocket 消息结构
export interface WsInboundMessage<P = unknown> {
  meta: MessageMeta;
  payload: {
    action: WebSocketAction;
    params: P;
    site?: string;
    originalCmd?: string;
    option?: string;
  };
}

export interface WsOutboundMessage<R = unknown> {
  meta: MessageMeta;
  payload: {
    action: WebSocketAction;
    status: 'success' | 'failed';
    result?: R;
    error?: string;
  };
}

// 历史记录项
export interface HistoryItem {
  id: string;
  timestamp: number;
  message: WsInboundMessage;
  label?: string;
}

// 消息监控项
export interface MonitorMessage {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received' | 'info';
  type: 'success' | 'error' | 'info';
  content: string;
  data?: unknown;
}

// 模板定义
export interface Template {
  id: string;
  name: string;
  description: string;
  action: WebSocketAction;
  message: WsInboundMessage;
}

