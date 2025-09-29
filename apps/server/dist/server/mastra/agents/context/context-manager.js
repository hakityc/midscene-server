/**
 * 上下文管理器
 * 集成 Mastra 记忆功能和 Midscene 的状态管理理念
 */
import { StrategySelector, } from '../strategies/intelligent-strategies.js';
// 简化的日志记录
const logger = {
    info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
};
/**
 * 智能上下文管理器
 * 借鉴 Midscene Agent 的上下文管理和状态保持能力
 */
export class ContextManager {
    memory;
    currentSession;
    frozenContext;
    contextCache = new Map();
    constructor(memory, sessionId) {
        this.memory = memory;
        this.currentSession = {
            sessionId: sessionId || this.generateSessionId(),
            startTime: Date.now(),
            pageHistory: [],
            operationHistory: [],
            globalState: {},
        };
    }
    /**
     * 生成会话ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 更新页面上下文
     */
    async updatePageContext(context) {
        try {
            const newContext = {
                url: context.url || '',
                title: context.title || '',
                description: context.description,
                structure: context.structure,
                timestamp: Date.now(),
                screenshot: context.screenshot,
                elementMap: context.elementMap || new Map(),
            };
            // 更新当前页面上下文
            this.currentSession.currentPage = newContext;
            // 添加到历史记录
            this.currentSession.pageHistory.push(newContext);
            // 缓存页面上下文（基于 URL）
            if (newContext.url) {
                this.contextCache.set(newContext.url, newContext);
            }
            // 持久化到记忆系统
            await this.saveContextToMemory(newContext);
            logger.info('页面上下文已更新', {
                url: newContext.url,
                title: newContext.title,
            });
        }
        catch (error) {
            logger.error('更新页面上下文失败', { error });
            throw error;
        }
    }
    /**
     * 记录操作历史
     */
    async recordOperation(operation) {
        try {
            const operationRecord = {
                id: this.generateOperationId(),
                timestamp: Date.now(),
                ...operation,
            };
            // 添加到操作历史
            this.currentSession.operationHistory.push(operationRecord);
            // 持久化操作记录
            await this.saveOperationToMemory(operationRecord);
            // 更新全局状态
            this.updateGlobalState(operationRecord);
            logger.info('操作记录已保存', {
                type: operation.type,
                target: operation.target,
                result: operation.result,
            });
        }
        catch (error) {
            logger.error('记录操作失败', { error });
        }
    }
    /**
     * 获取操作上下文
     */
    getOperationContext() {
        const recent = this.currentSession.operationHistory.slice(-10);
        const errorCount = recent.filter((op) => op.result === 'failure').length;
        const lastOperation = recent[recent.length - 1];
        return {
            pageUrl: this.currentSession.currentPage?.url,
            pageTitle: this.currentSession.currentPage?.title,
            pageDescription: this.currentSession.currentPage?.description,
            lastOperation: lastOperation?.type,
            operationHistory: recent.map((op) => `${op.type}:${op.result}`),
            errorCount,
            retryCount: lastOperation?.retryCount || 0,
        };
    }
    /**
     * 获取相似操作的历史记录
     */
    async getSimilarOperations(operationType, target) {
        try {
            // 从内存中搜索相似操作
            // 注意：这里需要根据实际的 Memory API 进行调整
            // const query = `operation_type:${operationType} target:${target}`;
            // const memories = await this.memory.search(query);
            // 临时实现：从操作历史中查找相似操作
            const similarOps = this.currentSession.operationHistory.filter((op) => op.type === operationType || op.target.includes(target));
            return similarOps;
        }
        catch (error) {
            logger.error('搜索相似操作失败', { error });
            return [];
        }
    }
    /**
     * 冻结当前页面上下文（类似 Midscene 的 freezePageContext）
     */
    async freezeContext() {
        if (this.currentSession.currentPage) {
            this.frozenContext = { ...this.currentSession.currentPage };
            logger.info('页面上下文已冻结');
        }
    }
    /**
     * 解冻页面上下文
     */
    async unfreezeContext() {
        this.frozenContext = undefined;
        logger.info('页面上下文已解冻');
    }
    /**
     * 获取当前页面上下文（优先返回冻结的上下文）
     */
    getCurrentPageContext() {
        return this.frozenContext || this.currentSession.currentPage;
    }
    /**
     * 获取页面上下文缓存
     */
    getCachedPageContext(url) {
        return this.contextCache.get(url);
    }
    /**
     * 获取智能操作建议
     */
    async getOperationSuggestions(taskType) {
        const context = this.getOperationContext();
        const strategy = StrategySelector.selectExecutionPattern(taskType, context);
        const optimizations = StrategySelector.getPerformanceOptimization(context);
        // 获取历史成功操作
        const similarOps = await this.getSimilarOperations(taskType, '');
        const successfulOps = similarOps.filter((op) => op.result === 'success');
        return {
            recommendedStrategy: strategy,
            performanceOptimizations: optimizations,
            historicalSuccess: successfulOps.length,
            learningInsights: this.generateLearningInsights(successfulOps),
        };
    }
    /**
     * 保存上下文到记忆系统
     */
    async saveContextToMemory(context) {
        try {
            // 注意：需要根据实际的 Memory API 进行调整
            // await this.memory.add({
            //   id: `context_${context.timestamp}`,
            //   text: JSON.stringify(context),
            //   metadata: {
            //     type: 'page_context',
            //     url: context.url,
            //     title: context.title,
            //     timestamp: context.timestamp
            //   }
            // });
            // 临时实现：记录到内存中
            logger.info('上下文已保存到记忆', {
                url: context.url,
                title: context.title,
            });
        }
        catch (error) {
            logger.error('保存上下文到记忆失败', { error });
        }
    }
    /**
     * 保存操作到记忆系统
     */
    async saveOperationToMemory(operation) {
        try {
            // 注意：需要根据实际的 Memory API 进行调整
            // await this.memory.add({
            //   id: operation.id,
            //   text: JSON.stringify(operation),
            //   metadata: {
            //     type: 'operation_record',
            //     operation_type: operation.type,
            //     target: operation.target,
            //     result: operation.result,
            //     timestamp: operation.timestamp
            //   }
            // });
            // 临时实现：记录到日志
            logger.info('操作已保存到记忆', {
                type: operation.type,
                target: operation.target,
                result: operation.result,
            });
        }
        catch (error) {
            logger.error('保存操作到记忆失败', { error });
        }
    }
    /**
     * 更新全局状态
     */
    updateGlobalState(operation) {
        // 更新错误统计
        if (operation.result === 'failure') {
            this.currentSession.globalState.errorCount =
                (this.currentSession.globalState.errorCount || 0) + 1;
        }
        // 更新成功统计
        if (operation.result === 'success') {
            this.currentSession.globalState.successCount =
                (this.currentSession.globalState.successCount || 0) + 1;
        }
        // 更新最后操作时间
        this.currentSession.globalState.lastOperationTime = operation.timestamp;
    }
    /**
     * 生成操作ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 生成学习洞察
     */
    generateLearningInsights(successfulOps) {
        if (successfulOps.length === 0)
            return {};
        // 分析成功操作的模式
        const avgDuration = successfulOps.reduce((sum, op) => sum + op.duration, 0) /
            successfulOps.length;
        const commonTargets = successfulOps.map((op) => op.target);
        const retryPatterns = successfulOps.map((op) => op.retryCount);
        return {
            averageDuration: avgDuration,
            commonTargets: [...new Set(commonTargets)],
            averageRetries: retryPatterns.reduce((sum, r) => sum + r, 0) / retryPatterns.length,
            successRate: successfulOps.length /
                (successfulOps.length + this.currentSession.globalState.errorCount ||
                    1),
        };
    }
    /**
     * 清理会话数据
     */
    async cleanup() {
        try {
            // 保存最终会话状态
            // 注意：需要根据实际的 Memory API 进行调整
            // await this.memory.add({
            //   id: `session_${this.currentSession.sessionId}`,
            //   text: JSON.stringify(this.currentSession),
            //   metadata: {
            //     type: 'session_summary',
            //     sessionId: this.currentSession.sessionId,
            //     duration: Date.now() - this.currentSession.startTime,
            //     operationCount: this.currentSession.operationHistory.length
            //   }
            // });
            // 清理缓存
            this.contextCache.clear();
            this.frozenContext = undefined;
            logger.info('会话清理完成', { sessionId: this.currentSession.sessionId });
        }
        catch (error) {
            logger.error('会话清理失败', { error });
        }
    }
}
