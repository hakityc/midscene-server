/**
 * 增强配置管理
 * 整合所有增强功能的配置选项
 */

export interface EnhancedBrowserAgentConfig {
  // 基础配置
  modelConfig: {
    name: string;
    apiKey: string;
    baseUrl: string;
  };

  // 性能配置
  performance: {
    maxRetries: number;
    defaultTimeout: number;
    batchOperationSize: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };

  // 智能策略配置
  strategies: {
    elementLocationStrategy: 'visual_first' | 'semantic_based' | 'adaptive';
    errorRecoveryEnabled: boolean;
    adaptiveRetryEnabled: boolean;
    contextCachingEnabled: boolean;
  };

  // 记忆和学习配置
  memory: {
    enabled: boolean;
    maxHistorySize: number;
    learningEnabled: boolean;
    sessionPersistence: boolean;
  };

  // 安全和合规配置
  safety: {
    rateLimitEnabled: boolean;
    maxOperationsPerMinute: number;
    sensitiveDataProtection: boolean;
    operationLogging: boolean;
  };

  // 调试和监控配置
  monitoring: {
    detailedLogging: boolean;
    performanceMetrics: boolean;
    errorReporting: boolean;
    toolCallTracking: boolean;
  };
}

// 默认配置
export const DEFAULT_CONFIG: EnhancedBrowserAgentConfig = {
  modelConfig: {
    name: process.env.TASK_MIDSCENE_MODEL_NAME || 'gpt-4',
    apiKey: process.env.TASK_OPENAI_API_KEY || '',
    baseUrl: process.env.TASK_OPENAI_BASE_URL || '',
  },

  performance: {
    maxRetries: 3,
    defaultTimeout: 30000,
    batchOperationSize: 5,
    cacheEnabled: true,
    cacheTTL: 300000, // 5分钟
  },

  strategies: {
    elementLocationStrategy: 'adaptive',
    errorRecoveryEnabled: true,
    adaptiveRetryEnabled: true,
    contextCachingEnabled: true,
  },

  memory: {
    enabled: true,
    maxHistorySize: 1000,
    learningEnabled: true,
    sessionPersistence: true,
  },

  safety: {
    rateLimitEnabled: true,
    maxOperationsPerMinute: 60,
    sensitiveDataProtection: true,
    operationLogging: true,
  },

  monitoring: {
    // 使用方括号语法避免 tsup 静态替换
    detailedLogging: process.env['NODE_ENV'] === 'development',
    performanceMetrics: true,
    errorReporting: true,
    toolCallTracking: true,
  },
};

/**
 * 配置管理器
 */
export class ConfigManager {
  private config: EnhancedBrowserAgentConfig;

  constructor(customConfig?: Partial<EnhancedBrowserAgentConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, customConfig);
    this.validateConfig();
  }

  /**
   * 获取配置
   */
  getConfig(): EnhancedBrowserAgentConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<EnhancedBrowserAgentConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  /**
   * 获取特定配置项
   */
  get<K extends keyof EnhancedBrowserAgentConfig>(
    key: K,
  ): EnhancedBrowserAgentConfig[K] {
    return this.config[key];
  }

  /**
   * 设置特定配置项
   */
  set<K extends keyof EnhancedBrowserAgentConfig>(
    key: K,
    value: EnhancedBrowserAgentConfig[K],
  ): void {
    this.config[key] = value;
    this.validateConfig();
  }

  /**
   * 合并配置
   */
  private mergeConfig(
    base: EnhancedBrowserAgentConfig,
    override?: Partial<EnhancedBrowserAgentConfig>,
  ): EnhancedBrowserAgentConfig {
    if (!override) return base;

    return {
      modelConfig: { ...base.modelConfig, ...override.modelConfig },
      performance: { ...base.performance, ...override.performance },
      strategies: { ...base.strategies, ...override.strategies },
      memory: { ...base.memory, ...override.memory },
      safety: { ...base.safety, ...override.safety },
      monitoring: { ...base.monitoring, ...override.monitoring },
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const { modelConfig, performance, safety } = this.config;

    // 验证模型配置
    if (!modelConfig.name) {
      throw new Error('模型名称不能为空');
    }
    // 注意：这里的 API Key 是 TASK_OPENAI_API_KEY（增强任务专用，非核心）
    // 如果未设置，会回退使用默认的 OPENAI_API_KEY，不需要警告
    // if (!modelConfig.baseUrl) {
    //   console.warn('⚠️ Base URL 未设置，可能影响功能使用');
    // }

    // 验证性能配置
    if (performance.maxRetries < 0 || performance.maxRetries > 10) {
      throw new Error('最大重试次数应在 0-10 之间');
    }
    if (
      performance.defaultTimeout < 1000 ||
      performance.defaultTimeout > 120000
    ) {
      throw new Error('默认超时时间应在 1-120 秒之间');
    }

    // 验证安全配置
    if (
      safety.maxOperationsPerMinute < 1 ||
      safety.maxOperationsPerMinute > 300
    ) {
      throw new Error('每分钟最大操作数应在 1-300 之间');
    }
  }

  /**
   * 导出配置为 JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从 JSON 导入配置
   */
  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeConfig(DEFAULT_CONFIG, importedConfig);
      this.validateConfig();
    } catch (error) {
      throw new Error(
        `配置导入失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): any {
    return {
      modelName: this.config.modelConfig.name,
      performanceOptimized: this.config.performance.cacheEnabled,
      intelligentStrategies: this.config.strategies.adaptiveRetryEnabled,
      memoryEnabled: this.config.memory.enabled,
      safetyEnabled: this.config.safety.rateLimitEnabled,
      monitoringEnabled: this.config.monitoring.detailedLogging,
    };
  }
}

// 导出全局配置管理器实例
export const globalConfig = new ConfigManager();

// 导出配置工具函数
export const configUtils = {
  /**
   * 为开发环境优化配置
   */
  optimizeForDevelopment: (): Partial<EnhancedBrowserAgentConfig> => ({
    monitoring: {
      detailedLogging: true,
      performanceMetrics: true,
      errorReporting: true,
      toolCallTracking: true,
    },
    performance: {
      maxRetries: 5,
      defaultTimeout: 60000,
      batchOperationSize: 3,
      cacheEnabled: true,
      cacheTTL: 60000, // 1分钟，便于测试
    },
  }),

  /**
   * 为生产环境优化配置
   */
  optimizeForProduction: (): Partial<EnhancedBrowserAgentConfig> => ({
    monitoring: {
      detailedLogging: false,
      performanceMetrics: true,
      errorReporting: true,
      toolCallTracking: false,
    },
    performance: {
      maxRetries: 3,
      defaultTimeout: 30000,
      batchOperationSize: 10,
      cacheEnabled: true,
      cacheTTL: 300000, // 5分钟
    },
    safety: {
      rateLimitEnabled: true,
      maxOperationsPerMinute: 30,
      sensitiveDataProtection: true,
      operationLogging: false,
    },
  }),

  /**
   * 为高性能优化配置
   */
  optimizeForPerformance: (): Partial<EnhancedBrowserAgentConfig> => ({
    performance: {
      maxRetries: 2,
      defaultTimeout: 15000,
      batchOperationSize: 15,
      cacheEnabled: true,
      cacheTTL: 600000, // 10分钟
    },
    strategies: {
      elementLocationStrategy: 'visual_first',
      errorRecoveryEnabled: true,
      adaptiveRetryEnabled: false,
      contextCachingEnabled: true,
    },
  }),
};
