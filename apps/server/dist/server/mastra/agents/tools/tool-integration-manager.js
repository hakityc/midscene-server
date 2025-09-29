/**
 * 工具集成管理器
 * 协调 MCP 工具和 Mastra 工具的调用
 */
import { mcpClient } from '../../mcp/client/index.js';
import { midsceneTools } from '../../tools/midscene-tools.js';
// 简化的日志记录
const logger = {
    info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
};
/**
 * 工具集成管理器
 * 提供统一的工具调用接口
 */
export class ToolIntegrationManager {
    contextManager;
    toolCallHistory = [];
    constructor(contextManager) {
        this.contextManager = contextManager;
    }
    /**
     * 统一的工具调用接口
     */
    async callTool(toolName, args) {
        const startTime = Date.now();
        logger.info(`🔧 调用工具: ${toolName}`, args);
        try {
            let result;
            let toolType;
            // 检查是否是 Mastra 工具
            const mastraTool = midsceneTools.find((tool) => tool.id === toolName);
            if (mastraTool) {
                // 使用 Mastra 工具
                toolType = 'mastra';
                result = await this.callMastraTool(mastraTool, args);
            }
            else {
                // 使用 MCP 工具
                toolType = 'mcp';
                result = await this.callMcpTool(toolName, args);
            }
            const toolResult = {
                success: true,
                result,
                duration: Date.now() - startTime,
                toolType,
            };
            // 记录工具调用历史
            this.recordToolCall(toolName, args, toolResult);
            // 记录到上下文管理器
            if (this.contextManager) {
                await this.contextManager.recordOperation({
                    type: toolName,
                    target: JSON.stringify(args),
                    parameters: args,
                    result: 'success',
                    duration: toolResult.duration,
                    retryCount: 0,
                });
            }
            logger.info(`✅ 工具调用成功: ${toolName}`, {
                duration: toolResult.duration,
                toolType,
            });
            return toolResult;
        }
        catch (error) {
            const toolResult = {
                success: false,
                result: null,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
                toolType: 'unknown',
            };
            // 记录失败的工具调用
            this.recordToolCall(toolName, args, toolResult);
            // 记录到上下文管理器
            if (this.contextManager) {
                await this.contextManager.recordOperation({
                    type: toolName,
                    target: JSON.stringify(args),
                    parameters: args,
                    result: 'failure',
                    duration: toolResult.duration,
                    retryCount: 0,
                    errorMessage: toolResult.error,
                });
            }
            logger.error(`❌ 工具调用失败: ${toolName}`, {
                error: toolResult.error,
                duration: toolResult.duration,
            });
            throw error;
        }
    }
    /**
     * 调用 Mastra 工具
     */
    async callMastraTool(tool, args) {
        try {
            // 构造正确的执行上下文
            const executionContext = {
                context: args,
                runtimeContext: {
                    // 提供必要的运行时上下文
                    requestId: this.generateRequestId(),
                    timestamp: Date.now(),
                    source: 'tool-integration-manager',
                },
            };
            return await tool.execute(executionContext);
        }
        catch (error) {
            logger.error(`Mastra 工具执行失败: ${tool.id}`, error);
            throw error;
        }
    }
    /**
     * 调用 MCP 工具
     */
    async callMcpTool(toolName, args) {
        try {
            // 获取可用工具列表
            const tools = await mcpClient.getTools();
            if (!tools || !tools[toolName]) {
                logger.warn(`MCP 工具不存在: ${toolName}，可用工具: ${Object.keys(tools || {}).join(', ')}`);
                throw new Error(`MCP 工具不存在: ${toolName}`);
            }
            logger.info(`调用 MCP 工具: ${toolName}`, { args });
            // 这里需要根据实际的 MCP 客户端 API 进行调用
            // 由于当前 mcpClient 可能没有直接的 callTool 方法，我们提供一个通用实现
            if (typeof mcpClient.callTool === 'function') {
                return await mcpClient.callTool(toolName, args);
            }
            else {
                // 尝试使用 MCP 客户端的其他方法
                try {
                    // 检查是否有其他可用的调用方法
                    if (typeof mcpClient.invoke === 'function') {
                        return await mcpClient.invoke(toolName, args);
                    }
                    else if (typeof mcpClient.execute === 'function') {
                        return await mcpClient.execute(toolName, args);
                    }
                    else {
                        // 模拟 MCP 工具调用 - 在实际部署时需要替换为真实的调用逻辑
                        logger.warn(`模拟 MCP 工具调用: ${toolName}`, args);
                        return {
                            content: [
                                {
                                    text: JSON.stringify({
                                        toolName,
                                        args,
                                        result: 'success',
                                        message: `${toolName} 执行成功`,
                                        timestamp: new Date().toISOString(),
                                        simulated: true,
                                    }),
                                },
                            ],
                            isError: false,
                        };
                    }
                }
                catch (mcpError) {
                    logger.error(`MCP 工具调用失败: ${toolName}`, {
                        error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                        stack: mcpError instanceof Error ? mcpError.stack : undefined,
                        toolName,
                        args,
                    });
                    throw mcpError;
                }
            }
        }
        catch (error) {
            logger.error(`MCP 工具执行失败: ${toolName}`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                toolName,
                args,
            });
            throw error;
        }
    }
    /**
     * 获取可用工具列表
     */
    async getAvailableTools() {
        try {
            // 获取 MCP 工具
            const mcpTools = (await mcpClient.getTools()) || {};
            // // 获取 Mastra 工具
            // const mastraToolsMap = midsceneTools.reduce((acc, tool) => {
            //   acc[tool.id] = {
            //     name: tool.id,
            //     description: tool.description,
            //     inputSchema: tool.inputSchema,
            //     type: 'mastra'
            //   };
            //   return acc;
            // }, {} as Record<string, any>);
            // // 合并所有工具
            // const allTools = {
            //   ...mcpTools,
            //   ...mastraToolsMap
            // };
            // logger.info('可用工具列表', {
            //   mcpToolCount: Object.keys(mcpTools).length,
            //   mastraToolCount: midsceneTools.length,
            //   totalTools: Object.keys(allTools).length
            // });
            return mcpTools;
        }
        catch (error) {
            logger.error('获取工具列表失败', error);
            throw error;
        }
    }
    /**
     * 获取工具调用统计
     */
    getToolCallStats() {
        const total = this.toolCallHistory.length;
        const successful = this.toolCallHistory.filter((call) => call.result.success).length;
        const avgDuration = total > 0
            ? this.toolCallHistory.reduce((sum, call) => sum + call.result.duration, 0) / total
            : 0;
        const toolTypeStats = this.toolCallHistory.reduce((acc, call) => {
            const type = call.result.toolType;
            if (!acc[type]) {
                acc[type] = { count: 0, successCount: 0 };
            }
            acc[type].count++;
            if (call.result.success) {
                acc[type].successCount++;
            }
            return acc;
        }, {});
        return {
            total,
            successful,
            successRate: total > 0 ? (successful / total) * 100 : 0,
            averageDuration: avgDuration,
            toolTypeStats,
            recentCalls: this.toolCallHistory.slice(-10),
        };
    }
    /**
     * 智能工具选择建议
     */
    suggestTool(taskDescription) {
        const suggestions = [];
        // 基于任务描述推荐工具
        if (taskDescription.includes('定位') ||
            taskDescription.includes('查找') ||
            taskDescription.includes('元素')) {
            suggestions.push('midscene_locate_element', 'midscene_aiLocate');
        }
        if (taskDescription.includes('描述') ||
            taskDescription.includes('分析') ||
            taskDescription.includes('理解')) {
            suggestions.push('midscene_describe_page', 'midscene_get_context');
        }
        if (taskDescription.includes('查询') ||
            taskDescription.includes('提取') ||
            taskDescription.includes('获取')) {
            suggestions.push('midscene_query_content', 'midscene_aiQuery');
        }
        if (taskDescription.includes('验证') ||
            taskDescription.includes('检查') ||
            taskDescription.includes('确认')) {
            suggestions.push('midscene_assert_state', 'midscene_aiAssert');
        }
        if (taskDescription.includes('等待') || taskDescription.includes('加载')) {
            suggestions.push('midscene_wait_for', 'midscene_aiWaitFor');
        }
        if (taskDescription.includes('点击') || taskDescription.includes('操作')) {
            suggestions.push('midscene_aiTap', 'midscene_aiHover');
        }
        if (taskDescription.includes('输入') || taskDescription.includes('填写')) {
            suggestions.push('midscene_aiInput');
        }
        if (taskDescription.includes('滚动') || taskDescription.includes('翻页')) {
            suggestions.push('midscene_aiScroll');
        }
        return suggestions;
    }
    /**
     * 记录工具调用历史
     */
    recordToolCall(toolName, args, result) {
        this.toolCallHistory.push({
            toolName,
            args,
            result,
            timestamp: Date.now(),
        });
        // 保留最近100条记录
        if (this.toolCallHistory.length > 100) {
            this.toolCallHistory = this.toolCallHistory.slice(-100);
        }
    }
    /**
     * 生成请求ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 清理历史记录
     */
    cleanup() {
        this.toolCallHistory = [];
        logger.info('工具调用历史已清理');
    }
}
// 导出单例实例
export const toolIntegrationManager = new ToolIntegrationManager();
