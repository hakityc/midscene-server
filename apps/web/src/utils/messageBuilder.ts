import { v4 as uuidv4 } from 'uuid';
import type {
  FlowAction,
  MessageMeta,
  Task,
  WsInboundMessage,
} from '@/types/debug';

/**
 * 生成消息元数据
 */
export function generateMeta(conversationId?: string): MessageMeta {
  return {
    messageId: uuidv4(),
    conversationId: conversationId || uuidv4(),
    timestamp: Date.now(),
  };
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
 * 将 FlowAction 转换为 API 格式
 * 根据官方文档支持所有可选配置参数
 */
export function flowActionToApiFormat(
  action: FlowAction,
): Record<string, unknown> {
  switch (action.type) {
    case 'aiTap':
      return filterUndefined({
        aiTap: action.locate || '',
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });

    case 'aiInput':
      return filterUndefined({
        aiInput: action.value,
        locate: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });

    case 'aiAssert':
      return filterUndefined({
        aiAssert: action.assertion,
        errorMessage: action.errorMessage,
        name: action.name,
      });

    case 'sleep':
      return { sleep: action.duration };

    case 'aiHover':
      return filterUndefined({
        aiHover: action.locate,
        xpath: action.xpath,
        deepThink: action.deepThink,
        cacheable: action.cacheable,
      });

    case 'aiScroll':
      return {
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

    case 'aiWaitFor':
      return {
        aiWaitFor: filterUndefined({
          assertion: action.assertion,
          timeoutMs: action.timeoutMs,
          checkIntervalMs: action.checkIntervalMs,
        }),
      };

    case 'aiKeyboardPress':
      return {
        aiKeyboardPress: filterUndefined({
          key: action.key,
          locate: action.locate,
          deepThink: action.deepThink,
        }),
        ...filterUndefined({
          xpath: action.xpath,
          cacheable: action.cacheable,
        }),
      };

    default:
      return {};
  }
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
    flow: task.flow.map(flowActionToApiFormat),
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
