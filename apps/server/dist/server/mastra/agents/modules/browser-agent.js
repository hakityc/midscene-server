import { Agent } from '@mastra/core/agent';
import { ContextManager } from '../context/context-manager.js';
// import { mcpClient } from '../../mcp/client/index.js'; // 已通过 toolManager 使用
import { createModel } from '../index.js';
import { memory } from '../memory/index.js';
import { ENHANCED_INSTRUCTIONS } from '../prompt/enhanced-instructions.js';
import { ToolIntegrationManager } from '../tools/tool-integration-manager.js';
import { EnhancedMidsceneWrapper } from './enhanced-midscene-wrapper.js';
// 简化的日志记录，避免类型错误
const log = {
    info: (message, data) => console.log(`[INFO] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN] ${message}`, data || ''),
};
// 创建上下文管理器
const contextManager = new ContextManager(memory);
// 创建增强的 Midscene 包装器
const enhancedWrapper = new EnhancedMidsceneWrapper(contextManager);
// 创建工具集成管理器
const toolManager = new ToolIntegrationManager(contextManager);
/**
 * 获取所有可用工具（MCP + Mastra 工具）
 */
const tools = async () => {
    try {
        // 使用工具集成管理器获取所有工具
        const allTools = await toolManager.getAvailableTools();
        log.info('✅ 工具加载成功', {
            totalTools: Object.keys(allTools).length,
            toolNames: Object.keys(allTools), // 显示前10个工具名称
        });
        return allTools;
    }
    catch (error) {
        log.error('❌ 工具加载失败', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        // 返回空工具集而不是抛出错误，让 Agent 能够继续工作
        log.warn('⚠️ 返回空工具集，Agent 将以纯文本模式工作');
        return {};
    }
};
/**
 * 增强的浏览器自动化助手
 * 融合 Midscene 的智能化能力与 Mastra 的框架优势
 */
export const browserAgent = new Agent({
    name: 'Enhanced Browser Agent',
    description: `专业的智能浏览器自动化助手，融合了 Midscene 的先进 AI 能力：
    🧠 视觉理解 - 智能"看懂"页面内容和布局
    🎯 精确定位 - 基于语义和视觉的元素定位
    🔄 自适应执行 - 根据页面状态动态调整策略
    📊 上下文感知 - 理解页面变化和操作影响
    🛡️ 错误恢复 - 自动处理异常并寻找替代方案
    📈 学习优化 - 从操作历史中学习和优化`,
    instructions: ENHANCED_INSTRUCTIONS,
    model: createModel(),
    tools,
    memory: memory,
});
// 导出所有增强组件，供其他模块使用
export { contextManager, enhancedWrapper, toolManager };
