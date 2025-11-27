/**
 * 标准日志字段规范和错误分类
 * 用于统一日志结构，便于查询和统计分析
 */

/**
 * 错误分类枚举 - 用于错误统计和分析
 */
export enum ErrorCategory {
  /** 系统内部错误（逻辑Bug、资源不足、代码异常） */
  SYSTEM_INTERNAL = 'system_internal',
  /** Midscene 流程错误（初始化失败、配置错误、流程中断） */
  MIDSCENE_FLOW = 'midscene_flow',
  /** Midscene 执行错误（元素未找到、AI 识别失败、执行超时） */
  MIDSCENE_EXECUTION = 'midscene_exec',
  /** 客户端输入错误（参数无效、格式错误、缺少必需字段） */
  CLIENT_INPUT = 'client_input',
  /** 连接类错误（WS断连、超时、网络问题） */
  CONNECTION = 'connection',
  /** 外部依赖错误（OSS、数据库、第三方服务） */
  DEPENDENCY = 'dependency',
}

/**
 * 标准日志字段规范
 * 所有日志应使用这些字段名，保持一致性
 */
export const LogFields = {
  // 标识字段
  TRACE_ID: 'traceId',
  REQUEST_ID: 'requestId',

  // 上下文字段
  MESSAGE_ID: 'messageId',
  CONVERSATION_ID: 'conversationId',
  CONNECTION_ID: 'connectionId',
  CLIENT_TYPE: 'clientType',

  // 业务字段
  EVENT_TYPE: 'eventType', // 事件类型：service.start, command.receive, error.occurred
  ACTION: 'action', // 操作类型

  // 命令相关字段（新增）
  COMMAND_ACTION: 'commandAction', // 指令动作
  COMMAND_PARAMS: 'commandParams', // 指令参数（已脱敏/截断）
  COMMAND_ORIGIN: 'commandOrigin', // 原始指令文本

  // 性能字段
  DURATION_MS: 'durationMs',

  // 错误字段
  ERROR: 'error',
  ERROR_CATEGORY: 'errorCategory', // 错误分类
  ERROR_CODE: 'errorCode',

  // 状态字段
  STATUS: 'status',
  RETRY_COUNT: 'retryCount',
} as const;
