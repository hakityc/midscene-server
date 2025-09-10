import { AsyncClient } from 'tencentcloud-cls-sdk-js-web';
import { TencentCLSTransportOptions, LogEntry } from '../types/cls.js';

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
    this.client = new AsyncClient({
      endpoint: options.endpoint,
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
    return this.logBuffer.length >= this.maxCount || this.getBufferSize() >= this.maxSize * 1024 * 1024;
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

  // 发送日志到腾讯云
  private async sendLogs(logs: LogEntry[]): Promise<void> {
    const logGroup = {
      topicId: process.env.CLS_TOPIC_ID!,
      logs: logs.map(log => ({
        timestamp: Math.floor(log.timestamp / 1000), // 转换为秒
        contents: [
          { key: 'level', value: log.level },
          { key: 'message', value: log.message },
          ...(log.data ? Object.entries(log.data).map(([k, v]) => ({ key: k, value: String(v) })) : []),
          ...(log.module ? [{ key: 'module', value: log.module }] : []),
          ...(this.appendFieldsFn ? Object.entries(this.appendFieldsFn()).map(([k, v]) => ({ key: k, value: String(v) })) : [])
        ]
      }))
    };

    await this.client.putLogs(logGroup);
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
