import { v4 as uuidv4 } from 'uuid';
import type {
  WsInboundMessage,
  MessageMeta,
  WebSocketAction,
  FlowAction,
  Task,
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
 * 将 FlowAction 转换为 API 格式
 */
export function flowActionToApiFormat(action: FlowAction): Record<string, unknown> {
  const { type, ...rest } = action;

  switch (type) {
    case 'aiTap':
      return { aiTap: rest.locate || '', xpath: rest.xpath };
    case 'aiInput':
      return { aiInput: rest.value, locate: rest.locate, xpath: rest.xpath };
    case 'aiAssert':
      return { aiAssert: rest.assertion };
    case 'sleep':
      return { sleep: rest.duration };
    case 'aiHover':
      return { aiHover: rest.locate, xpath: rest.xpath };
    case 'aiScroll':
      return {
        aiScroll: {
          direction: rest.direction,
          scrollType: rest.scrollType,
          distance: rest.distance,
          locate: rest.locate,
          deepThink: rest.deepThink,
        },
      };
    case 'aiWaitFor':
      return {
        aiWaitFor: {
          assertion: rest.assertion,
          timeoutMs: rest.timeoutMs,
          checkIntervalMs: rest.checkIntervalMs,
        },
      };
    case 'aiKeyboardPress':
      return {
        aiKeyboardPress: {
          key: rest.key,
          locate: rest.locate,
          deepThink: rest.deepThink,
        },
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

