import { AsyncClient, PutLogsRequest, LogGroup, Log } from 'tencentcloud-cls-sdk-js-web';
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
    const logGroup = new LogGroup('midscene-server');

    logs.forEach(logEntry => {
      const log = new Log(Math.floor(logEntry.timestamp / 1000)); // 转换为秒

      // 添加基本字段
      log.addContent('level', logEntry.level);
      log.addContent('message', logEntry.message);

      // 添加模块信息
      if (logEntry.module) {
        log.addContent('module', logEntry.module);
      }

      // 添加数据字段
      if (logEntry.data) {
        Object.entries(logEntry.data).forEach(([key, value]) => {
          log.addContent(key, String(value));
        });
      }

      // 添加附加字段
      if (this.appendFieldsFn) {
        Object.entries(this.appendFieldsFn()).forEach(([key, value]) => {
          log.addContent(key, String(value));
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
