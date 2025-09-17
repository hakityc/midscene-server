/**
 * 增强浏览器自动化助手 - 完整集成版本
 * 融合 Midscene 智能化能力与 Mastra 框架优势
 */

import { configUtils, globalConfig } from './config/enhanced-config';
import { errorHandler } from './error/error-handler';
import {
  browserAgent,
  contextManager,
  enhancedWrapper,
  toolManager,
} from './modules/browser-agent';

// 简化的日志记录
const logger = {
  info: (message: string, data?: any) =>
    console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) =>
    console.error(`[ERROR] ${message}`, data || ''),
  warn: (message: string, data?: any) =>
    console.warn(`[WARN] ${message}`, data || ''),
};

/**
 * 增强浏览器自动化助手类
 * 提供完整的智能化浏览器操作能力
 */
export class EnhancedBrowserAgent {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化系统
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('🚀 正在初始化增强浏览器自动化助手...');

      // 根据环境优化配置
      if (process.env.NODE_ENV === 'development') {
        globalConfig.updateConfig(configUtils.optimizeForDevelopment());
        logger.info('📝 已应用开发环境配置');
      } else {
        globalConfig.updateConfig(configUtils.optimizeForProduction());
        logger.info('🏭 已应用生产环境配置');
      }

      // 初始化错误处理器 (已在全局导出中定义)

      this.initialized = true;

      logger.info('✅ 增强浏览器自动化助手初始化完成');
      logger.info('🎯 可用功能:', {
        智能元素定位: '✓',
        视觉页面理解: '✓',
        上下文感知操作: '✓',
        自适应错误恢复: '✓',
        操作历史学习: '✓',
        性能优化: '✓',
      });
    } catch (error) {
      logger.error('❌ 增强浏览器自动化助手初始化失败', error);
      throw error;
    }
  }

  /**
   * 获取核心 Agent 实例
   */
  getAgent() {
    if (!this.initialized) {
      throw new Error('增强浏览器自动化助手尚未初始化');
    }
    return browserAgent;
  }

  /**
   * 获取上下文管理器
   */
  getContextManager() {
    return contextManager;
  }

  /**
   * 获取增强包装器
   */
  getEnhancedWrapper() {
    return enhancedWrapper;
  }

  /**
   * 获取工具管理器
   */
  getToolManager() {
    return toolManager;
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler() {
    return errorHandler;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager() {
    return globalConfig;
  }

  /**
   * 执行智能化浏览器操作
   */
  async executeOperation(
    operation: string,
    target?: string,
    options?: any,
  ): Promise<any> {
    try {
      logger.info(`🎯 执行操作: ${operation}`, { target, options });

      // 通过工具管理器调用相应工具
      const result = await toolManager.callTool(operation, {
        target,
        ...options,
      });

      logger.info(`✅ 操作完成: ${operation}`, {
        success: result.success,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error(`❌ 操作失败: ${operation}`, error);

      // 使用错误处理器进行智能恢复
      const recoveryResult = await errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        operation,
        target || '',
        options || {},
        0,
      );

      if (recoveryResult.shouldRetry) {
        logger.info(`🔄 尝试恢复操作: ${operation}`, recoveryResult);

        if (recoveryResult.waitTime) {
          await new Promise((resolve) =>
            setTimeout(resolve, recoveryResult.waitTime),
          );
        }

        // 重试操作
        return this.executeOperation(operation, target, {
          ...options,
          strategy: recoveryResult.newStrategy,
        });
      }

      throw error;
    }
  }

  /**
   * 批量执行操作
   */
  async executeBatchOperations(
    operations: Array<{
      operation: string;
      target?: string;
      options?: any;
    }>,
  ): Promise<any[]> {
    const results = [];

    for (const op of operations) {
      try {
        const result = await this.executeOperation(
          op.operation,
          op.target,
          op.options,
        );
        results.push({ success: true, result });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * 智能页面分析
   */
  async analyzePage(): Promise<any> {
    try {
      logger.info('🔍 开始智能页面分析...');

      const analysis = await enhancedWrapper.describePage();
      const context = await enhancedWrapper.getPageContext();

      const result = {
        description: analysis,
        context: context,
        timestamp: Date.now(),
        capabilities: await this.getPageCapabilities(),
      };

      logger.info('✅ 页面分析完成');
      return result;
    } catch (error) {
      logger.error('❌ 页面分析失败', error);
      throw error;
    }
  }

  /**
   * 获取页面操作能力
   */
  private async getPageCapabilities(): Promise<string[]> {
    const capabilities = [];

    try {
      // 检测可用的操作类型
      const tools = await toolManager.getAvailableTools();
      const toolNames = Object.keys(tools);

      if (
        toolNames.some(
          (name) => name.includes('locate') || name.includes('Locate'),
        )
      ) {
        capabilities.push('智能元素定位');
      }
      if (
        toolNames.some(
          (name) => name.includes('input') || name.includes('Input'),
        )
      ) {
        capabilities.push('文本输入');
      }
      if (
        toolNames.some(
          (name) =>
            name.includes('tap') ||
            name.includes('Tap') ||
            name.includes('click'),
        )
      ) {
        capabilities.push('点击操作');
      }
      if (
        toolNames.some(
          (name) => name.includes('scroll') || name.includes('Scroll'),
        )
      ) {
        capabilities.push('滚动操作');
      }
      if (
        toolNames.some(
          (name) => name.includes('query') || name.includes('Query'),
        )
      ) {
        capabilities.push('内容查询');
      }
      if (
        toolNames.some(
          (name) => name.includes('assert') || name.includes('Assert'),
        )
      ) {
        capabilities.push('状态验证');
      }
    } catch (error) {
      logger.warn('获取页面能力检测失败', error);
    }

    return capabilities;
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): any {
    return {
      initialized: this.initialized,
      config: globalConfig.getConfigSummary(),
      performance: {
        toolCalls: toolManager.getToolCallStats(),
        operations: enhancedWrapper.getOperationStats(),
        errors: errorHandler.getErrorStats(),
      },
      memory: {
        contextSize: contextManager.getCurrentPageContext() ? 1 : 0,
        // operationHistory: contextManager.getOperationContext()
      },
      capabilities: [
        '🧠 智能视觉理解',
        '🎯 精确元素定位',
        '🔄 自适应执行',
        '📊 上下文感知',
        '🛡️ 错误恢复',
        '📈 学习优化',
      ],
    };
  }

  /**
   * 清理系统资源
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('🧹 清理系统资源...');

      await contextManager.cleanup();
      toolManager.cleanup();
      errorHandler.cleanup();

      logger.info('✅ 系统资源清理完成');
    } catch (error) {
      logger.error('❌ 系统资源清理失败', error);
    }
  }

  /**
   * 重新初始化系统
   */
  async reinitialize(): Promise<void> {
    await this.cleanup();
    this.initialized = false;
    await this.initialize();
  }
}

// 导出增强浏览器自动化助手实例
export const enhancedBrowserAgent = new EnhancedBrowserAgent();

// 导出所有核心组件
export {
  browserAgent,
  contextManager,
  enhancedWrapper,
  toolManager,
  errorHandler,
  globalConfig,
};

export type * from './config/enhanced-config';
// 导出类型定义
export type * from './context/context-manager';
export type * from './error/error-handler';
export type * from './strategies/intelligent-strategies';
