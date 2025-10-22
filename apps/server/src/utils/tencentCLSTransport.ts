import {
  AsyncClient,
  Log,
  LogGroup,
  PutLogsRequest,
} from 'tencentcloud-cls-sdk-js-web';
import type { LogEntry, TencentCLSTransportOptions } from '../types/cls.js';

export class TencentCLSTransport {
  private client: AsyncClient;
  private logBuffer: LogEntry[] = [];
  private maxCount: number;
  private maxSize: number;
  private retryCount: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;
  private appendFieldsFn?: () => Record<string, any>;

  constructor(options: TencentCLSTransportOptions) {
    this.maxCount = options.maxCount || 100;
    this.maxSize = options.maxSize || 0.1; // 0.1MB
    this.retryCount = options.retryCount || 2;
    this.flushInterval = options.flushInterval || 5000;
    this.appendFieldsFn = options.appendFieldsFn;

    // 初始化腾讯云CLS客户端
    // 注意：这里需要根据实际的SDK API进行调整
    this.client = new AsyncClient({
      endpoint: options.endpoint,
      // 认证信息需要通过环境变量或其他方式设置
      retry_times: this.retryCount,
    });

    // 启动定时刷新
    this.startFlushTimer();
  }

  // 写入日志
  write(log: LogEntry): void {
    this.logBuffer.push(log);

    // 检查是否需要立即上报
    if (this.shouldFlush()) {
      this.flush();
    }
  }

  // 判断是否需要刷新
  private shouldFlush(): boolean {
    return (
      this.logBuffer.length >= this.maxCount ||
      this.getBufferSize() >= this.maxSize * 1024 * 1024
    );
  }

  // 计算缓冲区大小
  private getBufferSize(): number {
    return this.logBuffer.reduce((size, log) => {
      return size + JSON.stringify(log).length;
    }, 0);
  }

  // 刷新日志到腾讯云
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.sendLogs(logs);
    } catch (error) {
      console.error('腾讯云CLS日志上报失败:', error);
      // 失败时重新加入缓冲区
      this.logBuffer.unshift(...logs);
    }
  }

  // 序列化值为字符串
  private serializeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // 对于对象、数组等复杂类型，使用 JSON 序列化
    try {
      return JSON.stringify(value);
    } catch {
      // 如果序列化失败（如循环引用），返回类型信息
      return `[${typeof value}]`;
    }
  }

  // 移除 Emoji 和特殊字符，避免编码问题
  private sanitizeString(str: string): string {
    if (!str) return '';
    // 移除 Emoji 表情符号
    return str.replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      '',
    );
  }

  // 发送日志到腾讯云
  private async sendLogs(logs: LogEntry[]): Promise<void> {
    const logGroup = new LogGroup('midscene-server');

    logs.forEach((logEntry) => {
      // 使用带毫秒精度的浮点数时间戳（CLS 标准用法）
      // 例如: 1729169970232 ms -> 1729169970.232 s
      const timestampInSeconds = logEntry.timestamp;
      //TODO 这里 log 一直没法用毫秒，会报错
      const log = new Log(timestampInSeconds);

      // 添加基本字段（移除 Emoji）
      log.addContent('level', logEntry.level);
      log.addContent('message', this.sanitizeString(logEntry.message || ''));

      // 添加模块信息
      if (logEntry.module) {
        log.addContent('module', logEntry.module);
      }

      // 添加数据字段
      if (logEntry.data) {
        Object.entries(logEntry.data).forEach(([key, value]) => {
          log.addContent(key, this.serializeValue(value));
        });
      }

      // 添加附加字段
      if (this.appendFieldsFn) {
        Object.entries(this.appendFieldsFn()).forEach(([key, value]) => {
          log.addContent(key, this.serializeValue(value));
        });
      }

      logGroup.addLog(log);
    });

    const request = new PutLogsRequest(process.env.CLS_TOPIC_ID!, logGroup);
    await this.client.PutLogs(request);
  }

  // 启动定时刷新
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // 关闭传输器
  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // 刷新剩余日志
    this.flush();
  }
}
