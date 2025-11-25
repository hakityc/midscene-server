import type { WebSocketAction, WsOutboundMessage } from '@/types/debug';

/**
 * 根据 WebSocket 消息的 action 类型格式化消息内容
 */
export function formatWebSocketMessage(data: WsOutboundMessage): {
  title: string;
  description?: string;
  icon?: string;
  detail?: string;
  hint?: string;
} {
  const { action, status, result, error } = data.payload;
  const actionType = action as WebSocketAction;
  const isSuccess = status === 'success';

  // 错误消息统一处理
  if (!isSuccess) {
    return {
      title: getActionName(actionType),
      description: error || '执行失败',
      icon: '❌',
    };
  }

  // 根据 action 类型返回不同的格式化内容
  switch (actionType) {
    case 'aiCallbackStep':
      // AI 任务的步骤回调
      if (result && typeof result === 'object' && 'data' in result) {
        const stepResult = result as { data: string; meta?: any };
        const meta = stepResult.meta || {};
        const stageName = meta.stage || '执行中';
        const hasError = meta.bridgeError;
        return {
          title: hasError ? '⚠️ 任务步骤异常' : '🔄 任务步骤进度',
          description: `[${stageName}] ${stepResult.data}`,
          icon: meta.icon || (hasError ? '⚠️' : '🔄'), // 使用后端传来的 icon
          detail: meta.content, // 原始详细内容
          hint: meta.hint, // 补充提示
        };
      }
      return {
        title: '🔄 任务步骤进度',
        description:
          typeof result === 'string' ? result : JSON.stringify(result),
        icon: '🔄',
      };

    case 'callback': {
      // 总任务完成回调
      const { description, detail, hasErrors } = extractResultInfo(
        result,
        '任务已成功完成',
      );
      return {
        title: hasErrors ? '⚠️ 任务执行完成（存在失败）' : '✅ 任务执行完成',
        description,
        icon: hasErrors ? '⚠️' : '✅',
        detail,
      };
    }

    case 'downloadVideoCallback':
      // 视频下载回调
      return {
        title: '📹 视频下载进度',
        description: typeof result === 'string' ? result : '视频下载处理中...',
        icon: '📹',
      };

    case 'ai': {
      // AI 查询完成
      let aiDesc = 'AI 查询成功';
      if (typeof result === 'string') {
        aiDesc = result.slice(0, 100) + (result.length > 100 ? '...' : '');
      } else if (result && typeof result === 'object') {
        // 可能是复杂的 AI 响应
        const resultStr = JSON.stringify(result);
        aiDesc =
          resultStr.slice(0, 100) + (resultStr.length > 100 ? '...' : '');
      }
      return {
        title: '🤖 AI 查询完成',
        description: aiDesc,
        icon: '🤖',
      };
    }

    case 'aiScript': {
      // AI 脚本执行完成
      const {
        description: aiScriptDesc,
        detail: aiScriptDetail,
        hasErrors: scriptHasErrors,
      } = extractResultInfo(result, 'AI 脚本执行成功');
      return {
        title: scriptHasErrors
          ? '⚠️ AI 脚本执行完成（存在失败）'
          : '📝 AI 脚本执行完成',
        description: aiScriptDesc,
        icon: scriptHasErrors ? '⚠️' : '📝',
        detail: aiScriptDetail,
      };
    }

    case 'siteScript':
      // 站点脚本执行完成
      return {
        title: '🌐 站点脚本执行完成',
        description: typeof result === 'string' ? result : '站点脚本执行成功',
        icon: '🌐',
      };

    case 'command':
      // 命令执行完成
      return {
        title: '⚡ 命令执行完成',
        description: typeof result === 'string' ? result : '命令执行成功',
        icon: '⚡',
      };

    case 'connectTab':
      // 连接标签页成功
      return {
        title: '🔗 标签页连接成功',
        description:
          typeof result === 'string' ? result : '已成功连接到目标标签页',
        icon: '🔗',
      };

    case 'downloadVideo':
      // 视频下载开始
      return {
        title: '⬇️ 视频下载已启动',
        description: typeof result === 'string' ? result : '开始下载视频...',
        icon: '⬇️',
      };

    case 'agent':
      // Agent 执行完成
      return {
        title: '🤖 Agent 执行完成',
        description: typeof result === 'string' ? result : 'Agent 任务执行成功',
        icon: '🤖',
      };

    case 'error':
      // 错误消息
      return {
        title: '⚠️ 错误',
        description: error || '发生未知错误',
        icon: '⚠️',
      };

    case 'test':
      // 测试消息
      return {
        title: '🧪 测试消息',
        description: typeof result === 'string' ? result : '测试消息接收成功',
        icon: '🧪',
      };

    default:
      // 未知类型
      return {
        title: getActionName(actionType),
        description:
          typeof result === 'string'
            ? result
            : result
              ? '处理完成'
              : '执行成功',
        icon: '📌',
      };
  }
}

/**
 * 获取 action 的友好名称
 */
function getActionName(action: string): string {
  const actionNames: Record<string, string> = {
    connectTab: '连接标签页',
    ai: 'AI 查询',
    aiCallbackStep: 'AI 步骤',
    agent: 'Agent 执行',
    aiScript: 'AI 脚本',
    callback: '任务完成',
    error: '错误',
    downloadVideo: '下载视频',
    downloadVideoCallback: '视频下载',
    siteScript: '站点脚本',
    command: '命令',
    test: '测试',
  };

  return actionNames[action] || action;
}

/**
 * 格式化发送的消息
 */
export function formatSentMessage(action: string): {
  title: string;
  icon: string;
} {
  const actionInfo: Record<string, { title: string; icon: string }> = {
    connectTab: { title: '请求连接标签页', icon: '🔗' },
    ai: { title: '发送 AI 查询', icon: '🤖' },
    aiScript: { title: '执行 AI 脚本', icon: '📝' },
    agent: { title: '启动 Agent', icon: '🤖' },
    siteScript: { title: '执行站点脚本', icon: '🌐' },
    command: { title: '执行命令', icon: '⚡' },
    downloadVideo: { title: '请求下载视频', icon: '⬇️' },
    test: { title: '发送测试消息', icon: '🧪' },
  };

  return (
    actionInfo[action] || {
      title: `发送 ${action} 请求`,
      icon: '📤',
    }
  );
}

function extractResultInfo(
  result: unknown,
  fallbackDescription: string,
): {
  description: string;
  detail?: string;
  hasErrors?: boolean;
} {
  if (typeof result === 'string') {
    return {
      description: result,
    };
  }

  if (result && typeof result === 'object') {
    const resultObj = result as Record<string, any>;
    let description = fallbackDescription;

    if (typeof resultObj.message === 'string') {
      description = resultObj.message;
    } else if (
      typeof resultObj.data === 'string' ||
      typeof resultObj.data === 'number'
    ) {
      description = String(resultObj.data);
    } else if (
      resultObj.data &&
      typeof resultObj.data === 'object' &&
      typeof resultObj.data.message === 'string'
    ) {
      description = resultObj.data.message;
    } else if (typeof resultObj.result === 'string') {
      description = resultObj.result;
    }

    const hasErrors =
      Boolean(resultObj.hasErrors) ||
      (Array.isArray(resultObj.taskErrors) && resultObj.taskErrors.length > 0);

    return {
      description,
      detail: safeStringify(resultObj),
      hasErrors,
    };
  }

  return {
    description: fallbackDescription,
  };
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
}
