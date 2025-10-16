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
      result = filterUndefined({
        aiInput: action.value,
        locate: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiAssert':
      result = filterUndefined({
        aiAssert: action.assertion,
        errorMessage: action.errorMessage,
        name: action.name,
      });
      break;

    case 'aiHover':
      result = filterUndefined({
        aiHover: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiScroll':
      result = {
        aiScroll: filterUndefined({
          direction: action.direction,
          scrollType: action.scrollType,
          distance: action.distance,
          locate: action.locate,
          xpath: action.xpath,
          deepThink: action.deepThink,
        }),
        ...filterUndefined({
          cacheable: action.cacheable,
        }),
      };
      break;

    case 'aiWaitFor':
      result = filterUndefined({
        aiWaitFor: action.assertion,
        timeout: action.timeoutMs,
      });
      break;

    case 'aiKeyboardPress':
      result = filterUndefined({
        aiKeyboardPress: action.key,
        locate: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiDoubleClick':
      result = filterUndefined({
        aiDoubleClick: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    case 'aiRightClick':
      result = filterUndefined({
        aiRightClick: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });
      break;

    // ==================== 查询操作 ====================
    case 'aiQuery':
      result = filterUndefined({
        aiQuery: action.demand,
        name: action.name,
      });
      break;

    case 'aiString':
      result = { aiString: action.prompt };
      break;

    case 'aiNumber':
      result = { aiNumber: action.prompt };
      break;

    case 'aiBoolean':
      result = { aiBoolean: action.prompt };
      break;

    // ==================== 高级操作 ====================
    case 'aiAction':
      result = filterUndefined({
        aiAction: action.prompt,
        cacheable: action.cacheable,
      });
      break;

    case 'aiLocate':
      result = { aiLocate: action.prompt };
      break;

    // ==================== 工具方法 ====================
    case 'sleep':
      result = { sleep: action.duration };
      break;

    case 'screenshot':
      result = filterUndefined({
        screenshot: action.name,
      });
      break;

    case 'logText':
      result = { logText: action.text };
      break;

    case 'logScreenshot':
      result = filterUndefined({
        logScreenshot: action.title || 'untitled',
        content: action.content,
      });
      break;

    // ==================== Web 特有 ====================
    case 'javascript':
      result = filterUndefined({
        javascript: action.code,
        name: action.name,
      });
      break;

    // ==================== Windows 特有 ====================
    case 'getClipboard':
      result = { getClipboard: true };
      break;

    case 'setClipboard':
      result = { setClipboard: action.text };
      break;

    case 'getWindowList':
      result = { getWindowList: true };
      break;

    case 'activateWindow':
      result = { activateWindow: action.windowHandle };
      break;

    default:
      return null;
  }

  // 检查结果是否为空对象，如果是则返回 null
  return isEmptyObject(result) ? null : result;
}

/**
 * 构建 AI Script 消息
 */
export function buildAiScriptMessage(
  tasks: Task[],
  meta: MessageMeta,
  option?: string,
): WsInboundMessage {
  const formattedTasks = tasks.map((task) => ({
    name: task.name,
    continueOnError: task.continueOnError,
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
): WsInboundMessage {
  return {
    meta,
    payload: {
      action: 'ai',
      params: prompt,
      option,
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
