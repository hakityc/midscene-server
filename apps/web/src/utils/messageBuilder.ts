import { v4 as uuidv4 } from 'uuid';
import type {
  ClientType,
  FlowAction,
  MessageMeta,
  Task,
  WsInboundMessage,
} from '@/types/debug';

/**
 * 生成消息元数据
 * @param conversationId - 会话 ID（可选）
 * @param clientType - 客户端类型（可选，默认不设置，由服务端自动识别为 web）
 */
export function generateMeta(
  conversationId?: string,
  clientType?: ClientType,
): MessageMeta {
  const meta: MessageMeta = {
    messageId: uuidv4(),
    conversationId: conversationId || uuidv4(),
    timestamp: Date.now(),
  };

  // 只在明确指定时才添加 clientType
  if (clientType) {
    meta.clientType = clientType;
  }

  return meta;
}

/**
 * 过滤对象中的 undefined 值
 */
function filterUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * 检查对象是否为空
 */
function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 将 FlowAction 转换为 API 格式
 * 根据官方文档支持所有可选配置参数
 * @returns API 格式的对象，如果转换结果为空则返回 null
 */
export function flowActionToApiFormat(
  action: FlowAction,
): Record<string, unknown> | null {
  let result: Record<string, unknown>;

  switch (action.type) {
    // ==================== 基础操作 ====================
    case 'aiTap':
      result = filterUndefined({
        aiTap: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiInput':
      // aiInput 和 locate 都是必填字段，使用默认值确保字段存在
      result = filterUndefined({
        aiInput: action.value || '',
        locate: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiAssert':
      // assertion 是必填字段
      result = filterUndefined({
        aiAssert: action.assertion || '',
        errorMessage: action.errorMessage,
        name: action.name,
      });
      break;

    case 'aiHover':
      // locate 是必填字段
      result = filterUndefined({
        aiHover: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiScroll':
      // aiScroll 的值应该是 locate prompt（可选），其他参数在外层
      result = filterUndefined({
        aiScroll: action.locate || undefined, // locate 作为 aiScroll 的值
        direction: action.direction || 'down',
        scrollType: action.scrollType, // 可选字段，不给默认值
        distance: action.distance,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiWaitFor':
      // assertion 是必填字段
      result = filterUndefined({
        aiWaitFor: action.assertion || '',
        timeout: action.timeoutMs,
      });
      break;

    case 'aiKeyboardPress':
      // key 是必填字段
      result = filterUndefined({
        aiKeyboardPress: action.key || 'Enter',
        locate: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiDoubleClick':
      // locate 是必填字段
      result = filterUndefined({
        aiDoubleClick: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiRightClick':
      // locate 是必填字段
      result = filterUndefined({
        aiRightClick: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    // ==================== 查询操作 ====================
    case 'aiQuery':
      // demand 是必填字段
      result = filterUndefined({
        aiQuery: action.demand || '',
        name: action.name,
      });
      break;

    case 'aiString':
      // prompt 是必填字段
      result = { aiString: action.prompt || '' };
      break;

    case 'aiNumber':
      // prompt 是必填字段
      result = { aiNumber: action.prompt || '' };
      break;

    case 'aiBoolean':
      // prompt 是必填字段
      result = { aiBoolean: action.prompt || '' };
      break;

    case 'aiAsk':
      // prompt 是必填字段
      result = filterUndefined({
        aiAsk: action.prompt || '',
        domIncluded: action.domIncluded,
        screenshotIncluded: action.screenshotIncluded,
      });
      break;

    // ==================== 高级操作 ====================
    case 'aiAction':
      // prompt 是必填字段
      result = filterUndefined({
        aiAction: action.prompt || '',
        cacheable: action.cacheable,
      });
      break;

    case 'aiLocate':
      // prompt 是必填字段
      result = { aiLocate: action.prompt || '' };
      break;

    case 'runYaml':
      result = { runYaml: action.yaml || '' };
      break;

    case 'setAIActionContext':
      result = { setAIActionContext: action.actionContext || '' };
      break;

    // ==================== 工具方法 ====================
    case 'sleep':
      // duration 是必填字段
      result = { sleep: action.duration ?? 0 };
      break;

    case 'screenshot':
      result = filterUndefined({
        screenshot: action.name || undefined, // 空字符串转为 undefined
      });
      break;

    case 'logText':
      // text 是必填字段
      result = { logText: action.text || '' };
      break;

    case 'logScreenshot':
      result = filterUndefined({
        logScreenshot: action.title, // 可选字段，不给默认值
        content: action.content,
      });
      break;

    // ==================== Web 特有 ====================
    case 'javascript':
    case 'evaluateJavaScript': {
      const script = (action as any).code ?? (action as any).script ?? '';
      result = filterUndefined({
        javascript: script || '',
        name: action.name,
      });
      break;
    }

    // ==================== Windows 特有 ====================
    case 'getClipboard':
      result = { getClipboard: true };
      break;

    case 'setClipboard':
      // text 是必填字段
      result = { setClipboard: action.text || '' };
      break;

    case 'getWindowList':
      result = { getWindowList: true };
      break;

    case 'activateWindow':
      // windowHandle 是必填字段
      result = { activateWindow: action.windowHandle || '' };
      break;

    case 'freezePageContext':
      result = { freezePageContext: true };
      break;

    case 'unfreezePageContext':
      result = { unfreezePageContext: true };
      break;

    default:
      return null;
  }

  // 检查结果是否为空对象，如果是则返回 null
  if (isEmptyObject(result)) return null;

  // 追加可选的自定义步骤名称（统一放在 flowItem 顶层）
  if (action.leboStepName) {
    result.leboStepName = action.leboStepName;
  }

  return result;
}

/**
 * 构建 AI Script 消息
 */
export function buildAiScriptMessage(
  tasks: Task[],
  meta: MessageMeta,
  option?: string,
  context?: string,
): WsInboundMessage {
  const formattedTasks = tasks.map((task) => ({
    name: task.name,
    continueOnError: task.continueOnError,
    ...(task.maxRetriesForConnection !== undefined && {
      maxRetriesForConnection: task.maxRetriesForConnection,
    }),
    // 过滤掉未启用的动作（enabled 为 false 的动作）和转换后为空的动作
    flow: task.flow
      .filter((action) => action.enabled !== false)
      .map(flowActionToApiFormat)
      .filter((action): action is Record<string, unknown> => action !== null),
  }));

  return {
    meta,
    payload: {
      action: 'aiScript',
      params: {
        tasks: formattedTasks,
      },
      option,
      ...(context && context.trim() ? { context } : {}),
    },
  };
}

/**
 * 构建简单 AI 消息
 */
export function buildAiMessage(
  prompt: string,
  meta: MessageMeta,
  option?: string,
  context?: string,
): WsInboundMessage {
  return {
    meta,
    payload: {
      action: 'ai',
      params: prompt,
      option,
      ...(context && context.trim() ? { context } : {}),
    },
  };
}

/**
 * 构建站点脚本消息
 */
export function buildSiteScriptMessage(
  script: string,
  originalCmd: string | undefined,
  meta: MessageMeta,
): WsInboundMessage {
  return {
    meta,
    payload: {
      action: 'siteScript',
      params: script,
      originalCmd,
    },
  };
}

/**
 * 构建命令脚本信息
 */
export function buildCommandScriptMessage(
  command: string,
  meta: MessageMeta,
): WsInboundMessage {
  return {
    meta,
    payload: {
      action: 'command',
      params: command,
    },
  };
}

/**
 * 构建连接窗口消息
 */
export function buildConnectWindowMessage(
  windowId: string,
  windowTitle: string,
  meta: MessageMeta,
): WsInboundMessage {
  const params: { windowId?: number; windowTitle?: string } = {};

  // 如果 windowId 有效，优先使用它
  if (windowId && windowId.trim() !== '') {
    const id = Number.parseInt(windowId, 10);
    if (!Number.isNaN(id)) {
      params.windowId = id;
    }
  }

  // 如果 windowTitle 有效，添加它
  if (windowTitle && windowTitle.trim() !== '') {
    params.windowTitle = windowTitle.trim();
  }

  return {
    meta,
    payload: {
      action: 'connectWindow',
      params,
    },
  };
}

/**
 * 构建 Summarize 消息（对当前打开的网页进行总结）
 */
export function buildSummarizeMessage(
  fullPage: boolean,
  locate:
    | {
        rect: {
          left: number;
          top: number;
          width: number;
          height: number;
        };
      }
    | undefined,
  meta: MessageMeta,
): WsInboundMessage {
  const params: {
    fullPage?: boolean;
    locate?: {
      rect: {
        left: number;
        top: number;
        width: number;
        height: number;
      };
    };
  } = {};

  // 只在非默认值时添加 fullPage
  if (fullPage !== true) {
    params.fullPage = fullPage;
  }

  // 只在有值时添加 locate
  if (locate?.rect) {
    params.locate = locate;
  }

  return {
    meta,
    payload: {
      action: 'summarize',
      params,
    },
  };
}

/**
 * 格式化 JSON（用于显示）
 */
export function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * 验证 JSON 字符串
 */
export function validateJson(jsonString: string): {
  isValid: boolean;
  error?: string;
  parsed?: unknown;
} {
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}
