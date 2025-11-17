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
    aiScriptContext?: string;
    aiPrompt?: string;
    siteScript?: string;
    siteScriptCmd?: string;
    params?: string;
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
      // 解析 context（如果存在）
      const context = (payload as any)?.context;
      if (context && typeof context === 'string') {
        result.aiScriptContext = context;
      }
      break;
    }

    case 'ai': {
      const { prompt } = payload.params as any;
      result.aiPrompt = prompt;
      // 解析 context（如果存在）
      const context = (payload as any)?.context;
      if (context && typeof context === 'string') {
        result.aiScriptContext = context;
      }
      break;
    }

    case 'siteScript': {
      const { script, cmd } = payload.params as any;
      result.siteScript = script;
      result.siteScriptCmd = cmd;
      break;
    }

    case 'command': {
      result.params = payload.params as string;
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
export function parseFlow(flow: any[]): FlowAction[] {
  if (!Array.isArray(flow)) return [];

  return flow
    .map((action): FlowAction | null => {
      // 检查是否为空对象
      if (
        !action ||
        typeof action !== 'object' ||
        Object.keys(action).length === 0
      ) {
        return null;
      }

      // ==================== 基础操作 ====================
      if ('aiTap' in action) {
        return {
          type: 'aiTap' as const,
          locate: action.aiTap,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiInput' in action) {
        return {
          type: 'aiInput' as const,
          value: action.aiInput,
          locate: action.locate,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiAssert' in action) {
        return {
          type: 'aiAssert' as const,
          assertion: action.aiAssert,
          errorMessage: action.errorMessage,
          name: action.name,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiHover' in action) {
        return {
          type: 'aiHover' as const,
          locate: action.aiHover,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiScroll' in action) {
        return {
          type: 'aiScroll' as const,
          direction: action.aiScroll.direction || 'down',
          scrollType: action.aiScroll.scrollType || 'once',
          distance: action.aiScroll.distance,
          locate: action.aiScroll.locate,
          xpath: action.aiScroll.xpath,
          deepThink: action.aiScroll.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiWaitFor' in action) {
        return {
          type: 'aiWaitFor' as const,
          assertion: action.aiWaitFor,
          timeoutMs: action.timeout || action.timeoutMs,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiKeyboardPress' in action) {
        return {
          type: 'aiKeyboardPress' as const,
          key: action.aiKeyboardPress,
          locate: action.locate,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiDoubleClick' in action) {
        return {
          type: 'aiDoubleClick' as const,
          locate: action.aiDoubleClick,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiRightClick' in action) {
        return {
          type: 'aiRightClick' as const,
          locate: action.aiRightClick,
          xpath: action.xpath,
          deepThink: action.deepThink,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      // ==================== 查询操作 ====================
      if ('aiQuery' in action) {
        return {
          type: 'aiQuery' as const,
          demand: action.aiQuery,
          name: action.name,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiString' in action) {
        return {
          type: 'aiString' as const,
          prompt: action.aiString,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiNumber' in action) {
        return {
          type: 'aiNumber' as const,
          prompt: action.aiNumber,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiBoolean' in action) {
        return {
          type: 'aiBoolean' as const,
          prompt: action.aiBoolean,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiAsk' in action) {
        return {
          type: 'aiAsk' as const,
          prompt: action.aiAsk,
          domIncluded: action.domIncluded,
          screenshotIncluded: action.screenshotIncluded,
          leboStepName: action.leboStepName,
        };
      }

      // ==================== 高级操作 ====================
      if ('aiAction' in action) {
        return {
          type: 'aiAction' as const,
          prompt: action.aiAction,
          cacheable: action.cacheable,
          leboStepName: action.leboStepName,
        };
      }

      if ('aiLocate' in action) {
        return {
          type: 'aiLocate' as const,
          prompt: action.aiLocate,
          leboStepName: action.leboStepName,
        };
      }

      if ('runYaml' in action) {
        return {
          type: 'runYaml' as const,
          yaml: action.runYaml,
          leboStepName: action.leboStepName,
        };
      }

      if ('setAIActionContext' in action) {
        return {
          type: 'setAIActionContext' as const,
          actionContext: action.setAIActionContext,
          leboStepName: action.leboStepName,
        };
      }

      // ==================== 工具方法 ====================
      if ('sleep' in action) {
        return {
          type: 'sleep' as const,
          duration: action.sleep,
          leboStepName: action.leboStepName,
        };
      }

      if ('screenshot' in action) {
        return {
          type: 'screenshot' as const,
          name: action.screenshot,
          leboStepName: action.leboStepName,
        };
      }

      if ('logText' in action) {
        return {
          type: 'logText' as const,
          text: action.logText,
          leboStepName: action.leboStepName,
        };
      }

      if ('logScreenshot' in action) {
        return {
          type: 'logScreenshot' as const,
          title: action.logScreenshot,
          content: action.content,
          leboStepName: action.leboStepName,
        };
      }

      if ('freezePageContext' in action) {
        return {
          type: 'freezePageContext' as const,
          leboStepName: action.leboStepName,
        };
      }

      if ('unfreezePageContext' in action) {
        return {
          type: 'unfreezePageContext' as const,
          leboStepName: action.leboStepName,
        };
      }

      // ==================== Web 特有 ====================
      if ('javascript' in action) {
        return {
          type: 'evaluateJavaScript' as const,
          script: action.javascript,
          name: action.name,
          leboStepName: action.leboStepName,
        };
      }

      // ==================== Windows 特有 ====================
      if ('getClipboard' in action) {
        return {
          type: 'getClipboard' as const,
        };
      }

      if ('setClipboard' in action) {
        return {
          type: 'setClipboard' as const,
          text: action.setClipboard,
        };
      }

      if ('getWindowList' in action) {
        return {
          type: 'getWindowList' as const,
        };
      }

      if ('activateWindow' in action) {
        return {
          type: 'activateWindow' as const,
          windowHandle: action.activateWindow,
        };
      }

      // 未知动作类型，返回 null
      console.warn('Unknown action type:', action);
      return null;
    })
    .filter((action): action is FlowAction => action !== null);
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
