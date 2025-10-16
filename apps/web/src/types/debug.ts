// WebSocket Action 类型
export type WebSocketAction =
  | 'connectTab'
  | 'ai'
  | 'aiCallbackStep'
  | 'agent'
  | 'aiScript'
  | 'callback'
  | 'error'
  | 'downloadVideo'
  | 'downloadVideoCallback'
  | 'siteScript'
  | 'command'
  | 'test';

// 客户端类型
export type ClientType = 'web' | 'windows';

// 消息元数据
export interface MessageMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
  clientType?: ClientType; // 客户端类型：web 或 windows，不传默认为 web
}

// Flow 动作类型
export type FlowActionType =
  // 基础操作
  | 'aiTap'
  | 'aiInput'
  | 'aiAssert'
  | 'aiHover'
  | 'aiScroll'
  | 'aiWaitFor'
  | 'aiKeyboardPress'
  | 'aiDoubleClick'
  | 'aiRightClick'
  // 查询操作
  | 'aiQuery'
  | 'aiString'
  | 'aiNumber'
  | 'aiBoolean'
  // 高级操作
  | 'aiAction'
  | 'aiLocate'
  // 工具方法
  | 'sleep'
  | 'screenshot'
  | 'logText'
  | 'logScreenshot'
  // Web 特有
  | 'javascript'
  // Windows 特有
  | 'getClipboard'
  | 'setClipboard'
  | 'getWindowList'
  | 'activateWindow';

// Flow 动作基础接口
export interface BaseFlowAction {
  id?: string; // 用于拖拽排序的唯一标识
  type: FlowActionType;
  enabled?: boolean; // 是否启用，默认为 true
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

// aiDoubleClick 动作
export interface AiDoubleClickAction extends BaseFlowAction {
  type: 'aiDoubleClick';
  locate: string; // 定位描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiRightClick 动作
export interface AiRightClickAction extends BaseFlowAction {
  type: 'aiRightClick';
  locate: string; // 定位描述
  xpath?: string; // XPath 路径
  deepThink?: boolean; // 是否使用深度思考，默认 false
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiQuery 动作
export interface AiQueryAction extends BaseFlowAction {
  type: 'aiQuery';
  demand: string; // 查询需求描述
  name?: string; // 查询结果在 JSON 输出中的 key
}

// aiString 动作
export interface AiStringAction extends BaseFlowAction {
  type: 'aiString';
  prompt: string; // 查询内容
}

// aiNumber 动作
export interface AiNumberAction extends BaseFlowAction {
  type: 'aiNumber';
  prompt: string; // 查询内容
}

// aiBoolean 动作
export interface AiBooleanAction extends BaseFlowAction {
  type: 'aiBoolean';
  prompt: string; // 查询内容
}

// aiAction 动作
export interface AiActionAction extends BaseFlowAction {
  type: 'aiAction';
  prompt: string; // 任务描述
  cacheable?: boolean; // 是否允许缓存，默认 true
}

// aiLocate 动作
export interface AiLocateAction extends BaseFlowAction {
  type: 'aiLocate';
  prompt: string; // 元素描述
}

// screenshot 动作
export interface ScreenshotAction extends BaseFlowAction {
  type: 'screenshot';
  name?: string; // 截图名称
}

// logText 动作
export interface LogTextAction extends BaseFlowAction {
  type: 'logText';
  text: string; // 文本内容
}

// logScreenshot 动作
export interface LogScreenshotAction extends BaseFlowAction {
  type: 'logScreenshot';
  title?: string; // 截图标题
  content?: string; // 截图描述
}

// javascript 动作
export interface JavascriptAction extends BaseFlowAction {
  type: 'javascript';
  code: string; // JavaScript 代码
  name?: string; // 返回值名称
}

// getClipboard 动作
export interface GetClipboardAction extends BaseFlowAction {
  type: 'getClipboard';
}

// setClipboard 动作
export interface SetClipboardAction extends BaseFlowAction {
  type: 'setClipboard';
  text: string; // 剪贴板内容
}

// getWindowList 动作
export interface GetWindowListAction extends BaseFlowAction {
  type: 'getWindowList';
}

// activateWindow 动作
export interface ActivateWindowAction extends BaseFlowAction {
  type: 'activateWindow';
  windowHandle: string; // 窗口句柄
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
  | AiKeyboardPressAction
  | AiDoubleClickAction
  | AiRightClickAction
  | AiQueryAction
  | AiStringAction
  | AiNumberAction
  | AiBooleanAction
  | AiActionAction
  | AiLocateAction
  | ScreenshotAction
  | LogTextAction
  | LogScreenshotAction
  | JavascriptAction
  | GetClipboardAction
  | SetClipboardAction
  | GetWindowListAction
  | ActivateWindowAction;

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

export interface CommandParams {
  command: 'start' | 'stop' | string; // 支持 start, stop 及后续扩展
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
