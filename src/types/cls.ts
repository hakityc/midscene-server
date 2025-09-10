// 腾讯云CLS配置类型定义
export interface TencentCLSConfig {
  endpoint: string;        // 腾讯云CLS端点
  topicId: string;        // 日志主题ID
  maxCount?: number;      // 单次上报数量（默认100）
  maxSize?: number;       // 触发上报大小，单位MB（默认0.1）
  retryCount?: number;    // 重试次数（默认2）
  flushInterval?: number; // 刷新间隔，单位毫秒（默认5000）
}

// 腾讯云CLS传输器选项
export interface TencentCLSTransportOptions extends TencentCLSConfig {
  appendFieldsFn?: () => Record<string, any>; // 附加字段函数
}

// 日志条目类型
export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  data?: Record<string, any>;
  module?: string;
}

// 批量日志组类型
export interface LogGroup {
  logs: LogEntry[];
  topicId: string;
  source?: string;
  filename?: string;
  logTags?: Array<{
    key: string;
    value: string;
  }>;
}
