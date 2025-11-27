/**
 * 错误格式化工具
 * 将技术性的错误消息转换为用户友好的消息
 */

import { getTaskTipConfig } from './taskTipConfig';

/**
 * 错误类型枚举 - 用于分类和显示不同的用户友好提示
 */
export enum UserErrorType {
  /** 元素未找到 */
  ELEMENT_NOT_FOUND = 'element_not_found',
  /** 操作超时 */
  TIMEOUT = 'timeout',
  /** 连接错误 */
  CONNECTION_ERROR = 'connection_error',
  /** JavaScript 执行错误 */
  JS_EXECUTION_ERROR = 'js_execution_error',
  /** AI 识别错误 */
  AI_RECOGNITION_ERROR = 'ai_recognition_error',
  /** 输入验证错误 */
  INPUT_VALIDATION_ERROR = 'input_validation_error',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error',
}

export interface FormattedError {
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 错误类型 */
  errorType: UserErrorType;
  /** 图标 */
  icon: string;
  /** 原始错误详情（仅用于日志，不上报给用户） */
  originalDetail?: string;
}

/**
 * 错误模式匹配配置
 */
interface ErrorPattern {
  /** 匹配模式 */
  pattern: RegExp;
  /** 错误类型 */
  type: UserErrorType;
  /** 用户友好的消息模板（支持 $1, $2 等占位符） */
  template: string;
  /** 图标 */
  icon: string;
}

/**
 * 错误模式配置列表
 * 按优先级排序，先匹配的优先
 * 注意：template 中不包含 botName，会在格式化时自动添加
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // JavaScript 执行错误 - 提取具体的错误信息
  {
    pattern: /JavaScript execution failed:\s*Error:\s*(.+?)(?:\n|$)/i,
    type: UserErrorType.JS_EXECUTION_ERROR,
    template: '执行时遇到问题：$1',
    icon: '❌',
  },
  {
    pattern: /Error:\s*未找到(.+?)(?:\n|$)/i,
    type: UserErrorType.ELEMENT_NOT_FOUND,
    template: '没有找到$1',
    icon: '🔍',
  },
  {
    pattern: /Error:\s*(.+?)(?:\n|at\s|$)/i,
    type: UserErrorType.JS_EXECUTION_ERROR,
    template: '执行时遇到问题：$1',
    icon: '❌',
  },

  // 元素定位错误
  {
    pattern: /元素.*?未找到|找不到.*?元素|无法定位.*?元素/i,
    type: UserErrorType.ELEMENT_NOT_FOUND,
    template: '没有找到页面元素，请检查页面是否正确加载',
    icon: '🔍',
  },
  {
    pattern: /no\s+element\s+found|element\s+not\s+found/i,
    type: UserErrorType.ELEMENT_NOT_FOUND,
    template: '没有找到页面元素',
    icon: '🔍',
  },

  // 超时错误
  {
    pattern: /timeout|超时|timed?\s*out/i,
    type: UserErrorType.TIMEOUT,
    template: '等待超时了，请稍后重试',
    icon: '⏱️',
  },
  {
    pattern: /waitFor:\s*超时/i,
    type: UserErrorType.TIMEOUT,
    template: '等待元素时超时了',
    icon: '⏱️',
  },

  // 连接错误
  {
    pattern: /connection\s*lost|连接.*?断开|no\s+tab\s+is\s+connected/i,
    type: UserErrorType.CONNECTION_ERROR,
    template: '与浏览器的连接断开了，请重新连接',
    icon: '🔌',
  },
  {
    pattern: /bridge.*?disconnect|bridge.*?error/i,
    type: UserErrorType.CONNECTION_ERROR,
    template: '与浏览器的连接出现异常',
    icon: '🔌',
  },

  // AI 识别错误
  {
    pattern: /ai.*?fail|识别.*?失败|无法识别/i,
    type: UserErrorType.AI_RECOGNITION_ERROR,
    template: '识别页面内容失败了，请检查页面',
    icon: '🤖',
  },

  // 输入验证错误
  {
    pattern: /invalid.*?param|参数.*?无效|缺少.*?参数/i,
    type: UserErrorType.INPUT_VALIDATION_ERROR,
    template: '收到的参数无效',
    icon: '⚠️',
  },

  // 暂无相关结果
  {
    pattern: /暂无相关结果/i,
    type: UserErrorType.ELEMENT_NOT_FOUND,
    template: '没有找到相关结果',
    icon: '🔍',
  },
];

/**
 * 从原始错误消息中提取核心错误信息
 * 移除堆栈跟踪、bridge 调用信息等技术细节
 */
function extractCoreError(rawError: string): string {
  if (!rawError) return '';

  // 尝试从各种格式中提取核心错误
  let core = rawError;

  // 移除 "Error(s) occurred in running yaml script:" 前缀
  core = core.replace(/Error\(s\) occurred in running yaml script:\s*/gi, '');

  // 移除 "task - xxx:" 前缀，但保留后面的内容
  core = core.replace(/task\s*-\s*[^:]+:\s*/gi, '');

  // 移除 "Error from bridge client when calling..." 前缀
  const bridgeMatch = core.match(
    /Error from bridge client when calling.*?error:\s*(.+?)(?:\n|$)/is,
  );
  if (bridgeMatch) {
    core = bridgeMatch[1];
  }

  // 移除堆栈跟踪（以 "at " 开头的行）
  core = core.replace(/\n\s*at\s+.+/g, '');

  // 移除 "JavaScript execution failed: " 前缀，但保留具体错误
  const jsErrorMatch = core.match(
    /JavaScript execution failed:\s*Error:\s*(.+?)(?:\n|$)/i,
  );
  if (jsErrorMatch) {
    core = jsErrorMatch[1];
  }

  // 移除多余的空行和空格
  core = core.replace(/\n{2,}/g, '\n').trim();

  return core;
}

/**
 * 格式化错误消息为用户友好的格式
 * @param rawError 原始错误消息（可能是 Error 对象或字符串）
 * @returns 格式化后的错误信息
 */
export function formatUserError(rawError: unknown): FormattedError {
  const config = getTaskTipConfig();
  const defaultError: FormattedError = {
    userMessage: `${config.botName}遇到了一些问题，请稍后重试`,
    errorType: UserErrorType.UNKNOWN_ERROR,
    icon: '❌',
  };

  if (!rawError) {
    return defaultError;
  }

  // 获取错误字符串
  let errorString: string;
  if (rawError instanceof Error) {
    errorString = rawError.message;
  } else if (typeof rawError === 'string') {
    errorString = rawError;
  } else {
    errorString = String(rawError);
  }

  // 提取核心错误信息
  const coreError = extractCoreError(errorString);

  // 遍历错误模式进行匹配
  for (const pattern of ERROR_PATTERNS) {
    const match =
      errorString.match(pattern.pattern) || coreError.match(pattern.pattern);
    if (match) {
      // 替换模板中的占位符
      let messageContent = pattern.template;
      for (let i = 1; i < match.length; i++) {
        messageContent = messageContent.replace(`$${i}`, match[i] || '');
      }

      // 清理消息
      messageContent = messageContent.trim();

      // 如果消息太长，截断
      if (messageContent.length > 80) {
        messageContent = `${messageContent.substring(0, 77)}...`;
      }

      // 组装用户友好的消息：botName + 消息内容
      const userMessage = `${config.botName}${messageContent}`;

      return {
        userMessage,
        errorType: pattern.type,
        icon: pattern.icon,
        originalDetail: coreError,
      };
    }
  }

  // 如果没有匹配的模式，使用提取的核心错误（如果有的话）
  if (coreError && coreError.length < 80) {
    return {
      userMessage: `${config.botName}执行时遇到问题：${coreError}`,
      errorType: UserErrorType.UNKNOWN_ERROR,
      icon: '❌',
      originalDetail: coreError,
    };
  }

  return {
    ...defaultError,
    originalDetail: coreError || errorString,
  };
}

/**
 * 格式化脚本执行错误
 * 专门处理 YAML 脚本执行中的错误
 */
export function formatScriptError(rawError: unknown): FormattedError {
  return formatUserError(rawError);
}

/**
 * 获取错误类型的中文描述
 */
export function getErrorTypeDescription(type: UserErrorType): string {
  const descriptions: Record<UserErrorType, string> = {
    [UserErrorType.ELEMENT_NOT_FOUND]: '元素定位失败',
    [UserErrorType.TIMEOUT]: '操作超时',
    [UserErrorType.CONNECTION_ERROR]: '连接异常',
    [UserErrorType.JS_EXECUTION_ERROR]: '脚本执行错误',
    [UserErrorType.AI_RECOGNITION_ERROR]: 'AI 识别错误',
    [UserErrorType.INPUT_VALIDATION_ERROR]: '输入验证错误',
    [UserErrorType.UNKNOWN_ERROR]: '未知错误',
  };

  return descriptions[type] || '未知错误';
}
