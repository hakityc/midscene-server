import { v4 as uuidv4 } from 'uuid';
import type {
  FlowAction,
  MessageMeta,
  Task,
  WebSocketAction,
  WsInboundMessage,
} from '@/types/debug';

/**
 * 解析 JSON 消息到表单状态
 */
export function parseJsonToForm(jsonMessage: WsInboundMessage) {
  const { meta, payload } = jsonMessage;

  // 解析元数据
  const parsedMeta: MessageMeta = {
    messageId: meta.messageId || uuidv4(),
    conversationId: meta.conversationId || uuidv4(),
    timestamp: meta.timestamp || Date.now(),
  };

  // 解析 Action 类型
  const action = payload.action as WebSocketAction;

  // 解析 Action 特定的参数
  const result: {
    action: WebSocketAction;
    meta: MessageMeta;
    tasks?: Task[];
    enableLoadingShade?: boolean;
    aiPrompt?: string;
    siteScript?: string;
    siteScriptCmd?: string;
    videoUrl?: string;
    videoSavePath?: string;
  } = {
    action,
    meta: parsedMeta,
  };

  // 根据不同的 Action 类型解析参数
  switch (action) {
    case 'aiScript': {
      const { tasks, option } = payload.params as any;
      result.tasks = parseTasks(tasks);
      result.enableLoadingShade = option === 'LOADING_SHADE';
      break;
    }

    case 'ai': {
      const { prompt } = payload.params as any;
      result.aiPrompt = prompt;
      break;
    }

    case 'siteScript': {
      const { script, cmd } = payload.params as any;
      result.siteScript = script;
      result.siteScriptCmd = cmd;
      break;
    }

    case 'downloadVideo': {
      const { url, savePath } = payload.params as any;
      result.videoUrl = url;
      result.videoSavePath = savePath;
      break;
    }
  }

  return result;
}

/**
 * 解析任务列表
 */
function parseTasks(tasks: any[]): Task[] {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task, index) => ({
    id: uuidv4(),
    name: task.name || `任务 ${index + 1}`,
    continueOnError: task.continueOnError || false,
    flow: parseFlow(task.flow || []),
  }));
}

/**
 * 解析流程动作
 */
function parseFlow(flow: any[]): FlowAction[] {
  if (!Array.isArray(flow)) return [];

  return flow.map((action) => {
    // 处理不同类型的动作
    if (action.aiTap) {
      return {
        type: 'aiTap' as const,
        locate: action.aiTap,
        xpath: action.xpath,
      };
    }

    if (action.aiInput) {
      return {
        type: 'aiInput' as const,
        value: action.aiInput,
        locate: action.locate,
        xpath: action.xpath,
      };
    }

    if (action.aiAssert) {
      return {
        type: 'aiAssert' as const,
        assertion: action.aiAssert,
      };
    }

    if (action.sleep) {
      return {
        type: 'sleep' as const,
        duration: action.sleep,
      };
    }

    if (action.aiHover) {
      return {
        type: 'aiHover' as const,
        locate: action.aiHover,
        xpath: action.xpath,
      };
    }

    if (action.aiScroll) {
      return {
        type: 'aiScroll' as const,
        direction: action.aiScroll.direction || 'down',
        distance: action.aiScroll.distance || 100,
      };
    }

    if (action.aiWaitFor) {
      return {
        type: 'aiWaitFor' as const,
        assertion: action.aiWaitFor,
        timeoutMs: action.timeoutMs || 15000,
      };
    }

    if (action.aiKeyboardPress) {
      return {
        type: 'aiKeyboardPress' as const,
        key: action.aiKeyboardPress.key || 'Enter',
        locate: action.aiKeyboardPress.locate,
      };
    }

    // 默认返回空动作
    return {
      type: 'aiTap' as const,
      locate: '',
    };
  });
}

/**
 * 验证并解析 JSON 字符串
 */
export function parseJsonString(jsonString: string): {
  success: boolean;
  data?: ReturnType<typeof parseJsonToForm>;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    // 验证基本结构
    if (!parsed.meta || !parsed.payload) {
      return {
        success: false,
        error: 'JSON 格式无效：缺少 meta 或 payload 字段',
      };
    }

    // 验证 payload 结构
    if (!parsed.payload.action) {
      return {
        success: false,
        error: 'JSON 格式无效：payload 中缺少 action 字段',
      };
    }

    const formData = parseJsonToForm(parsed as WsInboundMessage);

    return {
      success: true,
      data: formData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    };
  }
}
