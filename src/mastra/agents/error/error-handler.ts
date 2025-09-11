/**
 * 增强错误处理和恢复系统
 * 借鉴 Midscene 的错误处理机制
 */

import type { ContextManager } from '../context/context-manager';
// import { StrategySelector } from '../strategies/intelligent-strategies'; // 未使用，暂时注释

// 简化的日志记录
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

export interface ErrorContext {
  operationType: string;
  operationTarget: string;
  operationArgs: any;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  timestamp: number;
  pageContext?: any;
}

export interface RecoveryStrategy {
  name: string;
  condition: (error: ErrorContext) => boolean;
  action: (error: ErrorContext) => Promise<RecoveryResult>;
  maxRetries: number;
  priority: number;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
  message: string;
  shouldRetry: boolean;
  newStrategy?: string;
  waitTime?: number;
}

/**
 * 智能错误处理器
 */
export class ErrorHandler {
  private contextManager?: ContextManager;
  private errorHistory: ErrorContext[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];

  constructor(contextManager?: ContextManager) {
    this.contextManager = contextManager;
    this.initializeRecoveryStrategies();
  }

  /**
   * 处理操作错误
   */
  async handleError(
    error: Error,
    operationType: string,
    operationTarget: string,
    operationArgs: any,
    retryCount: number = 0
  ): Promise<RecoveryResult> {
    const errorContext: ErrorContext = {
      operationType,
      operationTarget,
      operationArgs,
      errorMessage: error.message,
      errorStack: error.stack,
      retryCount,
      timestamp: Date.now(),
      pageContext: await this.getPageContext()
    };

    // 记录错误历史
    this.recordError(errorContext);

    logger.error(`🚨 操作错误: ${operationType}`, {
      target: operationTarget,
      error: error.message,
      retryCount
    });

    // 分析错误类型并选择恢复策略
    const strategy = this.selectRecoveryStrategy(errorContext);
    
    if (!strategy) {
      return {
        success: false,
        action: 'no_strategy',
        message: '未找到适合的恢复策略',
        shouldRetry: false
      };
    }

    logger.info(`🔧 应用恢复策略: ${strategy.name}`, { retryCount });

    try {
      // 执行恢复策略
      const result = await strategy.action(errorContext);
      
      if (result.success) {
        logger.info(`✅ 错误恢复成功: ${strategy.name}`, { action: result.action });
      } else {
        logger.warn(`⚠️ 错误恢复失败: ${strategy.name}`, { message: result.message });
      }

      return result;
    } catch (strategyError) {
      logger.error(`❌ 恢复策略执行失败: ${strategy.name}`, strategyError);
      
      return {
        success: false,
        action: 'strategy_failed',
        message: `恢复策略执行失败: ${strategyError instanceof Error ? strategyError.message : String(strategyError)}`,
        shouldRetry: retryCount < strategy.maxRetries
      };
    }
  }

  /**
   * 初始化恢复策略
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies = [
      // 元素定位失败恢复策略
      {
        name: 'element_location_recovery',
        condition: (error) => error.errorMessage.includes('not found') || 
                              error.errorMessage.includes('定位失败') ||
                              error.errorMessage.includes('无法找到'),
        action: async (error) => this.handleElementLocationFailure(error),
        maxRetries: 3,
        priority: 1
      },

      // 超时错误恢复策略
      {
        name: 'timeout_recovery',
        condition: (error) => error.errorMessage.includes('timeout') ||
                              error.errorMessage.includes('超时') ||
                              error.errorMessage.includes('timed out'),
        action: async (error) => this.handleTimeoutFailure(error),
        maxRetries: 2,
        priority: 2
      },

      // 网络错误恢复策略
      {
        name: 'network_recovery',
        condition: (error) => error.errorMessage.includes('network') ||
                              error.errorMessage.includes('连接') ||
                              error.errorMessage.includes('fetch'),
        action: async (error) => this.handleNetworkFailure(error),
        maxRetries: 3,
        priority: 3
      },

      // 页面状态错误恢复策略
      {
        name: 'page_state_recovery',
        condition: (error) => error.errorMessage.includes('page') ||
                              error.errorMessage.includes('页面') ||
                              error.errorMessage.includes('navigation'),
        action: async (error) => this.handlePageStateFailure(error),
        maxRetries: 2,
        priority: 4
      },

      // 通用重试策略
      {
        name: 'generic_retry',
        condition: () => true, // 总是适用的默认策略
        action: async (error) => this.handleGenericFailure(error),
        maxRetries: 1,
        priority: 10 // 最低优先级
      }
    ];

    // 按优先级排序
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 选择恢复策略
   */
  private selectRecoveryStrategy(error: ErrorContext): RecoveryStrategy | null {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.condition(error) && error.retryCount < strategy.maxRetries) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * 处理元素定位失败
   */
  private async handleElementLocationFailure(error: ErrorContext): Promise<RecoveryResult> {
    const actions = [
      '等待页面稳定',
      '重新获取页面上下文',
      '使用更具体的定位描述',
      '尝试备选定位策略'
    ];

    const actionIndex = Math.min(error.retryCount, actions.length - 1);
    // const action = actions[actionIndex]; // 用于日志记录，暂时注释

    // 根据重试次数选择不同的恢复动作
    switch (actionIndex) {
      case 0:
        // 等待页面稳定
        return {
          success: true,
          action: 'wait_for_stability',
          message: '等待页面稳定后重试',
          shouldRetry: true,
          waitTime: 2000
        };

      case 1:
        // 重新获取页面上下文
        return {
          success: true,
          action: 'refresh_context',
          message: '重新获取页面上下文',
          shouldRetry: true,
          newStrategy: 'semantic_based'
        };

      case 2:
        // 使用更具体的定位描述
        return {
          success: true,
          action: 'enhance_locator',
          message: '使用增强的定位描述',
          shouldRetry: true,
          newStrategy: 'deep_analysis'
        };

      default:
        // 尝试备选定位策略
        return {
          success: true,
          action: 'alternative_strategy',
          message: '尝试备选定位策略',
          shouldRetry: true,
          newStrategy: 'adaptive_retry'
        };
    }
  }

  /**
   * 处理超时失败
   */
  private async handleTimeoutFailure(error: ErrorContext): Promise<RecoveryResult> {
    if (error.retryCount === 0) {
      return {
        success: true,
        action: 'increase_timeout',
        message: '增加超时时间并重试',
        shouldRetry: true,
        waitTime: 3000
      };
    } else {
      return {
        success: true,
        action: 'split_operation',
        message: '将操作分解为更小的步骤',
        shouldRetry: true,
        waitTime: 5000
      };
    }
  }

  /**
   * 处理网络失败
   */
  private async handleNetworkFailure(error: ErrorContext): Promise<RecoveryResult> {
    const waitTime = Math.min(2000 * Math.pow(2, error.retryCount), 10000); // 指数退避，最大10秒

    return {
      success: true,
      action: 'network_retry',
      message: `网络重试，等待 ${waitTime}ms`,
      shouldRetry: true,
      waitTime
    };
  }

  /**
   * 处理页面状态失败
   */
  private async handlePageStateFailure(error: ErrorContext): Promise<RecoveryResult> {
    if (error.retryCount === 0) {
      return {
        success: true,
        action: 'refresh_page_state',
        message: '刷新页面状态',
        shouldRetry: true,
        waitTime: 1500
      };
    } else {
      return {
        success: true,
        action: 'navigate_to_safe_state',
        message: '导航到安全状态',
        shouldRetry: true,
        waitTime: 3000
      };
    }
  }

  /**
   * 处理通用失败
   */
  private async handleGenericFailure(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: true,
      action: 'generic_retry',
      message: '通用重试策略',
      shouldRetry: error.retryCount === 0,
      waitTime: 1000
    };
  }

  /**
   * 获取页面上下文
   */
  private async getPageContext(): Promise<any> {
    try {
      if (this.contextManager) {
        return this.contextManager.getCurrentPageContext();
      }
      return null;
    } catch (error) {
      logger.warn('获取页面上下文失败', error);
      return null;
    }
  }

  /**
   * 记录错误历史
   */
  private recordError(error: ErrorContext): void {
    this.errorHistory.push(error);

    // 保留最近50条错误记录
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    // 记录到上下文管理器
    if (this.contextManager) {
      this.contextManager.recordOperation({
        type: 'error_handling',
        target: error.operationType,
        parameters: {
          errorMessage: error.errorMessage,
          retryCount: error.retryCount
        },
        result: 'failure',
        duration: 0,
        retryCount: error.retryCount,
        errorMessage: error.errorMessage
      }).catch(err => {
        logger.warn('记录错误到上下文失败', err);
      });
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): any {
    const total = this.errorHistory.length;
    const byType = this.errorHistory.reduce((acc, error) => {
      const type = error.operationType;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = this.errorHistory.slice(-10);
    const avgRetryCount = total > 0 
      ? this.errorHistory.reduce((sum, error) => sum + error.retryCount, 0) / total 
      : 0;

    return {
      total,
      byType,
      recentErrors,
      averageRetryCount: avgRetryCount,
      mostCommonErrors: Object.entries(byType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }

  /**
   * 清理错误历史
   */
  cleanup(): void {
    this.errorHistory = [];
    logger.info('错误历史已清理');
  }
}

// 导出单例实例
export const errorHandler = new ErrorHandler();
