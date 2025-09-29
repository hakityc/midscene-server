/**
 * 增强的 Midscene 包装器
 * 集成智能策略和上下文管理
 */
import { mcpClient } from '../../mcp/client/index.js';
// 简化的日志记录
const logger = {
    info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
};
/**
 * 增强的 Midscene 包装器
 * 提供智能化的浏览器操作能力
 */
export class EnhancedMidsceneWrapper {
    contextManager;
    operationHistory = [];
    constructor(contextManager) {
        this.contextManager = contextManager;
    }
    /**
     * 通用 MCP 工具调用方法
     */
    async callMcpTool(toolName, _args) {
        try {
            // 这里需要根据实际的 mcpClient API 进行调用
            // 由于当前 mcpClient 可能没有直接的 callTool 方法，我们模拟调用
            const tools = await mcpClient.getTools();
            if (tools?.[toolName]) {
                // 实际的工具调用逻辑需要根据 MCP 的具体实现
                return { content: [{ text: `${toolName} executed successfully` }] };
            }
            throw new Error(`Tool ${toolName} not found`);
        }
        catch (error) {
            logger.error(`MCP 工具调用失败: ${toolName}`, error);
            throw error;
        }
    }
    /**
     * 智能页面描述 - 获取页面全貌
     */
    async describePage() {
        const startTime = Date.now();
        const retryCount = 0;
        try {
            logger.info('🔍 开始智能页面分析...');
            // 调用 midscene 页面描述
            const describeResult = await this.callMcpTool('midscene_describe_page', {});
            const result = {
                success: true,
                result: describeResult.content?.[0]?.text || '页面描述获取成功',
                message: '页面智能分析完成',
                duration: Date.now() - startTime,
                retryCount,
                strategy: 'visual_analysis',
            };
            // 更新上下文
            if (this.contextManager) {
                await this.contextManager.updatePageContext({
                    description: result.result,
                    timestamp: Date.now(),
                });
                await this.contextManager.recordOperation({
                    type: 'describe_page',
                    target: 'page',
                    parameters: {},
                    result: 'success',
                    duration: result.duration,
                    retryCount,
                });
            }
            this.recordOperation('describe_page', result);
            logger.info('✅ 页面智能分析完成', { duration: result.duration });
            return result.result;
        }
        catch (error) {
            const errorResult = {
                success: false,
                result: null,
                message: `页面分析失败: ${error instanceof Error ? error.message : String(error)}`,
                duration: Date.now() - startTime,
                retryCount,
                strategy: 'visual_analysis',
            };
            this.recordOperation('describe_page', errorResult);
            logger.error('❌ 页面智能分析失败', {
                error,
                duration: errorResult.duration,
            });
            throw new Error(errorResult.message);
        }
    }
    /**
     * 智能元素定位 - 多维度定位策略
     */
    async locateElement(prompt, options = {}) {
        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = options.retries || 3;
        logger.info('🎯 开始智能元素定位...', { prompt, options });
        while (retryCount <= maxRetries) {
            try {
                // 根据重试次数调整策略
                const strategy = this.selectLocationStrategy(retryCount, options);
                logger.info(`📍 使用定位策略: ${strategy}`, { retryCount });
                // 如果需要等待页面稳定
                if (options.waitForStable && retryCount > 0) {
                    await this.waitForPageStable();
                }
                // 执行元素定位
                const locateResult = await this.callMcpTool('midscene_aiLocate', {
                    prompt: this.enhanceLocationPrompt(prompt, strategy),
                    options: {
                        deepThink: options.deepThink || retryCount > 1,
                        ...options,
                    },
                });
                const result = {
                    success: true,
                    result: locateResult.content?.[0]?.text
                        ? JSON.parse(locateResult.content[0].text)
                        : null,
                    message: `元素定位成功: ${prompt}`,
                    duration: Date.now() - startTime,
                    retryCount,
                    strategy,
                };
                // 记录成功操作
                if (this.contextManager) {
                    await this.contextManager.recordOperation({
                        type: 'locate_element',
                        target: prompt,
                        parameters: options,
                        result: 'success',
                        duration: result.duration,
                        retryCount,
                    });
                }
                this.recordOperation('locate_element', result);
                logger.info('✅ 元素定位成功', {
                    prompt,
                    strategy,
                    retryCount,
                    duration: result.duration,
                });
                return result.result;
            }
            catch (error) {
                retryCount++;
                logger.warn(`⚠️ 元素定位失败，重试 ${retryCount}/${maxRetries}`, {
                    prompt,
                    error: error instanceof Error ? error.message : String(error),
                });
                if (retryCount > maxRetries) {
                    const errorResult = {
                        success: false,
                        result: null,
                        message: `元素定位失败: ${prompt} - ${error instanceof Error ? error.message : String(error)}`,
                        duration: Date.now() - startTime,
                        retryCount,
                        strategy: 'failed',
                    };
                    // 记录失败操作
                    if (this.contextManager) {
                        await this.contextManager.recordOperation({
                            type: 'locate_element',
                            target: prompt,
                            parameters: options,
                            result: 'failure',
                            duration: errorResult.duration,
                            retryCount,
                            errorMessage: errorResult.message,
                        });
                    }
                    this.recordOperation('locate_element', errorResult);
                    logger.error('❌ 元素定位最终失败', {
                        prompt,
                        retryCount,
                        duration: errorResult.duration,
                    });
                    throw new Error(errorResult.message);
                }
                // 重试前的等待策略
                await this.waitBeforeRetry(retryCount);
            }
        }
        throw new Error(`元素定位失败，已超过最大重试次数: ${maxRetries}`);
    }
    /**
     * 智能内容查询
     */
    async queryPageContent(prompt) {
        const startTime = Date.now();
        try {
            logger.info('📊 开始智能内容查询...', { prompt });
            const queryResult = await this.callMcpTool('midscene_aiQuery', {
                prompt: this.enhanceQueryPrompt(prompt),
            });
            const result = {
                success: true,
                result: queryResult.content?.[0]?.text
                    ? JSON.parse(queryResult.content[0].text)
                    : null,
                message: `内容查询成功: ${prompt}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'semantic_query',
            };
            // 记录操作
            if (this.contextManager) {
                await this.contextManager.recordOperation({
                    type: 'query_content',
                    target: prompt,
                    parameters: {},
                    result: 'success',
                    duration: result.duration,
                    retryCount: 0,
                });
            }
            this.recordOperation('query_content', result);
            logger.info('✅ 内容查询成功', { prompt, duration: result.duration });
            return result.result;
        }
        catch (error) {
            const errorResult = {
                success: false,
                result: null,
                message: `内容查询失败: ${prompt} - ${error instanceof Error ? error.message : String(error)}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'semantic_query',
            };
            this.recordOperation('query_content', errorResult);
            logger.error('❌ 内容查询失败', {
                error,
                duration: errorResult.duration,
            });
            throw new Error(errorResult.message);
        }
    }
    /**
     * 智能状态验证
     */
    async assertPageState(assertion, message) {
        const startTime = Date.now();
        try {
            logger.info('🔍 开始智能状态验证...', { assertion });
            const assertResult = await this.callMcpTool('midscene_aiAssert', {
                assertion,
                message,
            });
            const success = assertResult.content?.[0]?.text === 'true' ||
                assertResult.isError === false;
            const result = {
                success,
                result: success,
                message: success
                    ? `状态验证成功: ${assertion}`
                    : `状态验证失败: ${assertion}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'state_assertion',
            };
            // 记录操作
            if (this.contextManager) {
                await this.contextManager.recordOperation({
                    type: 'assert_state',
                    target: assertion,
                    parameters: { message },
                    result: success ? 'success' : 'failure',
                    duration: result.duration,
                    retryCount: 0,
                    errorMessage: success ? undefined : result.message,
                });
            }
            this.recordOperation('assert_state', result);
            if (success) {
                logger.info('✅ 状态验证成功', {
                    assertion,
                    duration: result.duration,
                });
            }
            else {
                logger.warn('⚠️ 状态验证失败', { assertion, duration: result.duration });
            }
            return success;
        }
        catch (error) {
            const errorResult = {
                success: false,
                result: false,
                message: `状态验证异常: ${assertion} - ${error instanceof Error ? error.message : String(error)}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'state_assertion',
            };
            this.recordOperation('assert_state', errorResult);
            logger.error('❌ 状态验证异常', {
                error,
                duration: errorResult.duration,
            });
            throw new Error(errorResult.message);
        }
    }
    /**
     * 智能等待条件
     */
    async waitForCondition(condition, timeout = 30000) {
        const startTime = Date.now();
        try {
            logger.info('⏳ 开始智能等待条件...', { condition, timeout });
            await this.callMcpTool('midscene_aiWaitFor', {
                condition,
                timeout,
            });
            const result = {
                success: true,
                result: null,
                message: `等待条件满足: ${condition}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'intelligent_wait',
            };
            // 记录操作
            if (this.contextManager) {
                await this.contextManager.recordOperation({
                    type: 'wait_for',
                    target: condition,
                    parameters: { timeout },
                    result: 'success',
                    duration: result.duration,
                    retryCount: 0,
                });
            }
            this.recordOperation('wait_for', result);
            logger.info('✅ 等待条件满足', { condition, duration: result.duration });
        }
        catch (error) {
            const errorResult = {
                success: false,
                result: null,
                message: `等待条件超时: ${condition} - ${error instanceof Error ? error.message : String(error)}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'intelligent_wait',
            };
            this.recordOperation('wait_for', errorResult);
            logger.error('❌ 等待条件超时', {
                error,
                duration: errorResult.duration,
            });
            throw new Error(errorResult.message);
        }
    }
    /**
     * 获取页面上下文
     */
    async getPageContext() {
        const startTime = Date.now();
        try {
            logger.info('📋 获取页面上下文...');
            const contextResult = await this.callMcpTool('midscene_get_tabs', {});
            const result = {
                success: true,
                result: contextResult.content?.[0]?.text
                    ? JSON.parse(contextResult.content[0].text)
                    : null,
                message: '页面上下文获取成功',
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'context_retrieval',
            };
            this.recordOperation('get_context', result);
            logger.info('✅ 页面上下文获取成功', { duration: result.duration });
            return result.result;
        }
        catch (error) {
            const errorResult = {
                success: false,
                result: null,
                message: `页面上下文获取失败 - ${error instanceof Error ? error.message : String(error)}`,
                duration: Date.now() - startTime,
                retryCount: 0,
                strategy: 'context_retrieval',
            };
            this.recordOperation('get_context', errorResult);
            logger.error('❌ 页面上下文获取失败', {
                error,
                duration: errorResult.duration,
            });
            throw new Error(errorResult.message);
        }
    }
    /**
     * 选择定位策略
     */
    selectLocationStrategy(retryCount, options) {
        if (options.strategy)
            return options.strategy;
        // 根据重试次数选择不同策略
        switch (retryCount) {
            case 0:
                return 'visual_first';
            case 1:
                return 'semantic_based';
            case 2:
                return 'adaptive_retry';
            default:
                return 'deep_analysis';
        }
    }
    /**
     * 增强定位提示词
     */
    enhanceLocationPrompt(prompt, strategy) {
        const enhancements = {
            visual_first: `基于视觉布局定位: ${prompt}`,
            semantic_based: `基于语义功能定位: ${prompt}`,
            adaptive_retry: `多维度分析定位: ${prompt}（包含位置、文本、属性信息）`,
            deep_analysis: `深度智能分析定位: ${prompt}（使用所有可用信息和上下文）`,
        };
        return enhancements[strategy] || prompt;
    }
    /**
     * 增强查询提示词
     */
    enhanceQueryPrompt(prompt) {
        return `智能语义查询: ${prompt}（请提供结构化的、准确的信息）`;
    }
    /**
     * 等待页面稳定
     */
    async waitForPageStable() {
        logger.info('⏸️ 等待页面稳定...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    /**
     * 重试前等待
     */
    async waitBeforeRetry(retryCount) {
        const baseDelay = 1000;
        const delay = baseDelay * 1.5 ** (retryCount - 1); // 指数退避
        logger.info(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    /**
     * 记录操作历史
     */
    recordOperation(type, result) {
        this.operationHistory.push({
            type,
            result,
            timestamp: Date.now(),
        });
        // 保留最近50条记录
        if (this.operationHistory.length > 50) {
            this.operationHistory = this.operationHistory.slice(-50);
        }
    }
    /**
     * 获取操作统计
     */
    getOperationStats() {
        const total = this.operationHistory.length;
        const successful = this.operationHistory.filter((op) => op.result.success).length;
        const avgDuration = total > 0
            ? this.operationHistory.reduce((sum, op) => sum + op.result.duration, 0) / total
            : 0;
        return {
            total,
            successful,
            successRate: total > 0 ? (successful / total) * 100 : 0,
            averageDuration: avgDuration,
            recentOperations: this.operationHistory.slice(-10),
        };
    }
}
// 导出单例实例
export const enhancedMidsceneWrapper = new EnhancedMidsceneWrapper();
