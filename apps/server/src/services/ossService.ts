import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import COS from 'cos-nodejs-sdk-v5';
import { config } from '../config';
import { serviceLogger } from '../utils/logger';

/**
 * OSS 上传服务
 *
 * 功能：
 * 1. 上传 midscene report 文件到腾讯云 COS
 * 2. 管理最新上传的 report URL
 * 3. 提供 URL 访问接口供日志系统使用
 *
 * 使用示例：
 * ```ts
 * const ossService = OssService.getInstance();
 * const url = await ossService.uploadReport('/path/to/report.html');
 * console.log('最新 report URL:', ossService.getLatestReportUrl());
 * ```
 */
export class OssService {
  // ==================== 单例模式 ====================
  private static instance: OssService | null = null;

  // ==================== 核心属性 ====================
  private cosClient: COS | null = null;
  private isEnabled: boolean = false;
  private latestReportUrl: string | null = null;

  // ==================== 配置属性 ====================
  private bucket: string = '';
  private region: string = '';
  private reportPath: string = '';
  private customUrl?: string; // 自定义域名 URL 前缀

  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OssService {
    if (!OssService.instance) {
      OssService.instance = new OssService();
    }
    return OssService.instance;
  }

  /**
   * 重置单例实例（测试用）
   */
  public static resetInstance(): void {
    OssService.instance = null;
  }

  /**
   * 初始化 COS 客户端
   */
  private initialize(): void {
    if (!config.cos) {
      serviceLogger.info('COS 配置未找到，OSS 上传功能已禁用');
      this.isEnabled = false;
      return;
    }

    try {
      this.cosClient = new COS({
        SecretId: config.cos.secretId,
        SecretKey: config.cos.secretKey,
      });

      this.bucket = config.cos.bucket;
      this.region = config.cos.region;
      this.reportPath = config.cos.reportPath;
      this.customUrl = config.cos.url;

      this.isEnabled = true;
      serviceLogger.info(
        {
          bucket: this.bucket,
          region: this.region,
          reportPath: this.reportPath,
          customUrl: this.customUrl,
        },
        '✅ OSS 服务初始化成功',
      );
    } catch (error) {
      serviceLogger.error({ error }, '❌ OSS 服务初始化失败');
      this.isEnabled = false;
    }
  }

  /**
   * 检查服务是否可用
   */
  public isReady(): boolean {
    return this.isEnabled && this.cosClient !== null;
  }

  /**
   * 上传 report 文件到 COS
   *
   * @param filePath - 本地文件路径
   * @returns 上传后的 URL，如果失败返回 null
   */
  public async uploadReport(filePath: string): Promise<string | null> {
    if (!this.isReady()) {
      serviceLogger.warn('OSS 服务未启用，跳过上传');
      return null;
    }

    try {
      const fileName = basename(filePath);
      const key = `${this.reportPath}/${fileName}`;

      // 读取文件内容
      const fileContent = readFileSync(filePath);

      serviceLogger.info(
        {
          filePath,
          key,
          fileSize: fileContent.length,
        },
        '开始上传 report 到 COS',
      );

      // 上传到 COS
      const result = await this.uploadToCOS(key, fileContent);

      if (result) {
        this.latestReportUrl = result;
        serviceLogger.info(
          {
            url: result,
            fileName,
          },
          '✅ Report 上传成功',
        );
        return result;
      }

      return null;
    } catch (error) {
      serviceLogger.error(
        {
          error,
          filePath,
        },
        '❌ Report 上传失败',
      );
      return null;
    }
  }

  /**
   * 上传文件到 COS（核心上传逻辑）
   */
  private uploadToCOS(key: string, body: Buffer): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.cosClient) {
        reject(new Error('COS 客户端未初始化'));
        return;
      }

      this.cosClient.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: body,
          ContentType: 'text/html',
        },
        (err, _data) => {
          if (err) {
            serviceLogger.error({ error: err }, 'COS putObject 失败');
            reject(err);
            return;
          }

          // 构造访问 URL
          let url: string;
          if (this.customUrl) {
            // 使用自定义域名
            // 格式：https://custom-domain.com/{key}
            url = `${this.customUrl}/${key}`;
          } else {
            // 使用默认 COS 域名
            // 格式：https://{bucket}.cos.{region}.myqcloud.com/{key}
            url = `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
          }
          resolve(url);
        },
      );
    });
  }

  /**
   * 获取最新上传的 report URL
   */
  public getLatestReportUrl(): string | null {
    return this.latestReportUrl;
  }

  /**
   * 清空最新 URL（测试用）
   */
  public clearLatestReportUrl(): void {
    this.latestReportUrl = null;
  }

  /**
   * 批量上传多个文件
   *
   * @param filePaths - 文件路径数组
   * @returns 成功上传的 URL 数组
   */
  public async uploadReports(filePaths: string[]): Promise<string[]> {
    if (!this.isReady()) {
      serviceLogger.warn('OSS 服务未启用，跳过批量上传');
      return [];
    }

    const results: string[] = [];

    for (const filePath of filePaths) {
      try {
        const url = await this.uploadReport(filePath);
        if (url) {
          results.push(url);
        }
      } catch (error) {
        serviceLogger.error(
          {
            error,
            filePath,
          },
          '批量上传中单个文件失败',
        );
        // 继续处理其他文件
      }
    }

    return results;
  }

  /**
   * 获取服务状态信息
   */
  public getStatus(): {
    enabled: boolean;
    bucket: string;
    region: string;
    reportPath: string;
    latestReportUrl: string | null;
  } {
    return {
      enabled: this.isEnabled,
      bucket: this.bucket,
      region: this.region,
      reportPath: this.reportPath,
      latestReportUrl: this.latestReportUrl,
    };
  }
}

// 导出单例实例
export const ossService = OssService.getInstance();
