// WebSocket Action 类型
export type WebSocketAction =
  | 'connectTab'
  | 'connectWindow'
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
  | 'test'
  | 'summarize';

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
  | 'aiAsk'
  // 高级操作
  | 'aiAction'
  | 'aiLocate'
  | 'runYaml'
  | 'setAIActionContext'
  // 工具方法
  | 'sleep'
  | 'screenshot'
  | 'logText'
  | 'logScreenshot'
  | 'freezePageContext'
  | 'unfreezePageContext'
  // Web 特有
  | 'javascript'
  | 'evaluateJavaScript'
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
  // 自定义步骤名称（用于服务端自定义 tip），可选
  leboStepName?: string;
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

// aiAsk 动作
export interface AiAskAction extends BaseFlowAction {
  type: 'aiAsk';
  prompt: string; // 提问内容
  domIncluded?: boolean | 'visible-only'; // 是否包含简化 DOM
  screenshotIncluded?: boolean; // 是否包含截图
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

// runYaml 动作
export interface RunYamlAction extends BaseFlowAction {
  type: 'runYaml';
  yaml: string; // YAML 脚本内容
}

// setAIActionContext 动作
export interface SetAIActionContextAction extends BaseFlowAction {
  type: 'setAIActionContext';
  actionContext: string; // 上下文内容
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

// freezePageContext 动作
export interface FreezePageContextAction extends BaseFlowAction {
  type: 'freezePageContext';
}

// unfreezePageContext 动作
export interface UnfreezePageContextAction extends BaseFlowAction {
  type: 'unfreezePageContext';
}

// javascript 动作
export interface JavascriptAction extends BaseFlowAction {
  type: 'javascript';
  code: string; // JavaScript 代码
  name?: string; // 返回值名称
  script?: string; // 兼容 evaluateJavaScript 的脚本字段
}

// evaluateJavaScript 动作
export interface EvaluateJavaScriptAction extends BaseFlowAction {
  type: 'evaluateJavaScript';
  script: string; // JavaScript 表达式
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
  | AiAskAction
  | AiActionAction
  | AiLocateAction
  | RunYamlAction
  | SetAIActionContextAction
  | ScreenshotAction
  | LogTextAction
  | LogScreenshotAction
  | FreezePageContextAction
  | UnfreezePageContextAction
  | JavascriptAction
  | EvaluateJavaScriptAction
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

export interface SummarizeParams {
  fullPage?: boolean; // 是否全页截图，默认 true
  locate?: {
    rect: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }; // 指定要总结的区域
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

// 任务状态
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled';

// 消息监控项
export interface MonitorMessage {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received' | 'info';
  type: 'success' | 'error' | 'info';
  content: string;
  data?: unknown;
  // 扩展任务属性
  taskId?: string; // 任务 ID
  taskStatus?: TaskStatus; // 任务状态
  taskProgress?: number; // 任务进度 (0-100)
  duration?: number; // 任务执行时长(毫秒)
  errorCode?: string; // 错误代码
  isRead?: boolean; // 是否已读
  // 新增字段
  icon?: string; // emoji 图标
  detail?: string; // 原始详细内容（用于展开显示）
  hint?: string; // 补充提示
}

// 模板定义
export interface Template {
  id: string;
  name: string;
  description: string;
  action: WebSocketAction;
  message: WsInboundMessage;
  clientType?: ClientType; // 客户端类型：web 或 windows
}
