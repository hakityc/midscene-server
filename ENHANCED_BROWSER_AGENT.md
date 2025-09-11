# 增强浏览器自动化助手 (Enhanced Browser Agent)

融合 Midscene 智能化能力与 Mastra 框架优势的专业浏览器自动化解决方案。

## 🚀 核心特性

### 🧠 智能化能力
- **视觉理解**: 智能"看懂"页面内容和布局
- **语义定位**: 基于语义和视觉信息的精确元素定位
- **上下文感知**: 理解页面状态变化和操作影响
- **自适应执行**: 根据页面状态动态调整操作策略

### 🛡️ 可靠性保障
- **错误恢复**: 自动处理异常并寻找替代方案
- **智能重试**: 多层次的自适应重试机制
- **状态验证**: 每步操作后的智能验证
- **操作历史**: 从历史操作中学习和优化

### 📈 性能优化
- **批量操作**: 合并相似操作提高效率
- **智能缓存**: 减少重复分析和计算
- **资源管理**: 合理控制资源使用
- **并发控制**: 优化并发操作性能

## 📋 系统架构

```
Enhanced Browser Agent
├── 🎯 Core Agent (基于 Mastra Agent)
├── 🧠 Enhanced Instructions (增强提示词系统)
├── 🔧 Tool Integration Manager (工具集成管理)
├── 📊 Context Manager (上下文管理)
├── 🛡️ Error Handler (错误处理)
├── ⚙️ Config Manager (配置管理)
└── 🎪 Enhanced Wrapper (Midscene 包装器)
```

## 🔧 快速开始

### 1. 基础使用

```typescript
import { enhancedBrowserAgent } from './src/mastra/agents/enhanced-browser-agent';

// 获取 Agent 实例
const agent = enhancedBrowserAgent.getAgent();

// 执行智能操作
await enhancedBrowserAgent.executeOperation('midscene_locate_element', '登录按钮');
await enhancedBrowserAgent.executeOperation('midscene_aiTap', '登录按钮');
```

### 2. 智能页面分析

```typescript
// 分析当前页面
const pageAnalysis = await enhancedBrowserAgent.analyzePage();
console.log('页面描述:', pageAnalysis.description);
console.log('页面能力:', pageAnalysis.capabilities);
```

### 3. 批量操作

```typescript
const operations = [
  { operation: 'midscene_locate_element', target: '用户名输入框' },
  { operation: 'midscene_aiInput', target: '用户名输入框', options: { value: 'admin' } },
  { operation: 'midscene_locate_element', target: '密码输入框' },
  { operation: 'midscene_aiInput', target: '密码输入框', options: { value: 'password' } },
  { operation: 'midscene_aiTap', target: '登录按钮' }
];

const results = await enhancedBrowserAgent.executeBatchOperations(operations);
```

## 🎯 主要工具和功能

### 页面理解工具
- `midscene_describe_page`: 获取页面详细描述和分析
- `midscene_get_context`: 获取页面详细上下文信息
- `midscene_query_content`: 查询页面特定内容

### 智能定位工具
- `midscene_locate_element`: AI 驱动的元素定位
- `midscene_aiLocate`: 高级元素定位（支持多种策略）

### 操作执行工具
- `midscene_aiTap`: 智能点击操作
- `midscene_aiInput`: 智能文本输入
- `midscene_aiScroll`: 智能滚动操作
- `midscene_aiHover`: 鼠标悬停操作
- `midscene_aiKeyboardPress`: 键盘操作

### 状态管理工具
- `midscene_wait_for`: 智能等待页面条件
- `midscene_assert_state`: 验证页面状态
- `midscene_screenshot`: 截图和记录

## 🔧 配置管理

### 环境配置

```typescript
import { globalConfig, configUtils } from './src/mastra/agents/config/enhanced-config';

// 开发环境优化
globalConfig.updateConfig(configUtils.optimizeForDevelopment());

// 生产环境优化
globalConfig.updateConfig(configUtils.optimizeForProduction());

// 性能优化
globalConfig.updateConfig(configUtils.optimizeForPerformance());
```

### 自定义配置

```typescript
globalConfig.updateConfig({
  performance: {
    maxRetries: 5,
    defaultTimeout: 60000,
    cacheEnabled: true
  },
  strategies: {
    elementLocationStrategy: 'adaptive',
    errorRecoveryEnabled: true,
    adaptiveRetryEnabled: true
  }
});
```

## 🛡️ 错误处理和恢复

系统提供多层次的智能错误处理：

### 自动恢复策略
1. **元素定位失败**: 多种定位策略自动切换
2. **超时错误**: 动态调整等待时间和策略
3. **网络错误**: 指数退避重试机制
4. **页面状态错误**: 智能状态恢复

### 手动错误处理

```typescript
import { errorHandler } from './src/mastra/agents/enhanced-browser-agent';

// 获取错误统计
const errorStats = errorHandler.getErrorStats();
console.log('错误统计:', errorStats);
```

## 📊 性能监控

### 系统状态监控

```typescript
// 获取系统状态
const status = enhancedBrowserAgent.getSystemStatus();
console.log('系统状态:', status);

// 工具调用统计
const toolStats = enhancedBrowserAgent.getToolManager().getToolCallStats();
console.log('工具统计:', toolStats);
```

### 操作历史分析

```typescript
// 获取上下文管理器
const contextManager = enhancedBrowserAgent.getContextManager();

// 获取操作建议
const suggestions = await contextManager.getOperationSuggestions('搜索商品');
console.log('操作建议:', suggestions);
```

## 🎪 高级功能

### 上下文冻结

```typescript
const contextManager = enhancedBrowserAgent.getContextManager();

// 冻结当前页面上下文
await contextManager.freezeContext();

// 执行操作（使用冻结的上下文）
await enhancedBrowserAgent.executeOperation('midscene_aiTap', '按钮');

// 解冻上下文
await contextManager.unfreezeContext();
```

### 智能工具选择

```typescript
const toolManager = enhancedBrowserAgent.getToolManager();

// 根据任务描述获取工具建议
const suggestions = toolManager.suggestTool('在页面上查找并点击登录按钮');
console.log('推荐工具:', suggestions);
```

## 🔄 操作模式

### 智能搜索模式
```typescript
// 自动应用搜索模式
await enhancedBrowserAgent.executeOperation('midscene_describe_page');
await enhancedBrowserAgent.executeOperation('midscene_locate_element', '搜索框');
await enhancedBrowserAgent.executeOperation('midscene_aiInput', '搜索框', { value: '商品名称' });
await enhancedBrowserAgent.executeOperation('midscene_aiKeyboardPress', 'Enter');
await enhancedBrowserAgent.executeOperation('midscene_wait_for', '搜索结果出现');
```

### 表单填写模式
```typescript
// 智能表单处理
await enhancedBrowserAgent.executeOperation('midscene_get_context');
// 系统会自动识别表单字段并提供填写建议
```

## 🚀 最佳实践

### 1. 操作前检查
```typescript
// 始终先分析页面
const analysis = await enhancedBrowserAgent.analyzePage();
console.log('页面能力:', analysis.capabilities);
```

### 2. 错误处理
```typescript
try {
  await enhancedBrowserAgent.executeOperation('midscene_aiTap', '按钮');
} catch (error) {
  // 系统会自动尝试恢复，如果失败才抛出错误
  console.error('操作最终失败:', error);
}
```

### 3. 性能优化
```typescript
// 使用批量操作
const operations = [
  // 多个相关操作
];
await enhancedBrowserAgent.executeBatchOperations(operations);
```

### 4. 资源清理
```typescript
// 任务完成后清理资源
await enhancedBrowserAgent.cleanup();
```

## 🔧 环境变量配置

```bash
# 必需的环境变量
TASK_MIDSCENE_MODEL_NAME=gpt-4
TASK_OPENAI_API_KEY=your_api_key
TASK_OPENAI_BASE_URL=https://api.openai.com/v1

# 可选的环境变量
MIDSCENE_USE_QWEN_VL=false
MIDSCENE_CACHE=true
NODE_ENV=development
```

## 📈 系统特性对比

| 特性 | 传统 Browser Agent | Enhanced Browser Agent |
|------|-------------------|------------------------|
| 元素定位 | 基础选择器 | 🧠 AI 智能定位 |
| 错误处理 | 简单重试 | 🛡️ 智能恢复策略 |
| 操作策略 | 固定模式 | 🔄 自适应执行 |
| 学习能力 | 无 | 📈 历史学习优化 |
| 上下文管理 | 基础 | 📊 智能上下文感知 |
| 性能优化 | 有限 | ⚡ 全面性能优化 |

## 🎯 使用场景

1. **复杂表单自动化**: 智能识别和填写复杂表单
2. **数据采集任务**: 智能页面内容提取和分析
3. **端到端测试**: 可靠的自动化测试执行
4. **用户行为模拟**: 真实用户操作模拟
5. **页面监控**: 智能页面状态监控和验证

## 🔧 故障排除

### 常见问题

1. **工具调用失败**
   ```typescript
   // 检查工具状态
   const tools = await enhancedBrowserAgent.getToolManager().getAvailableTools();
   console.log('可用工具:', Object.keys(tools));
   ```

2. **元素定位失败**
   ```typescript
   // 尝试不同的定位策略
   await enhancedBrowserAgent.executeOperation('midscene_locate_element', '按钮', {
     strategy: 'semantic_based'
   });
   ```

3. **性能问题**
   ```typescript
   // 应用性能优化配置
   globalConfig.updateConfig(configUtils.optimizeForPerformance());
   ```

## 📚 扩展阅读

- [Midscene 官方文档](https://midscene.web.dev/)
- [Mastra 框架文档](https://mastra.ai/docs)
- [项目配置说明](./CLS_CONFIG.md)
- [集成说明](./MIDSCENE_INTEGRATION.md)

---

## 🎉 总结

Enhanced Browser Agent 通过融合 Midscene 的智能化能力和 Mastra 的框架优势，提供了：

- 🧠 **智能化**: 真正理解页面内容的 AI 驱动操作
- 🛡️ **可靠性**: 多层次的错误处理和恢复机制  
- 📈 **学习能力**: 从操作历史中不断学习和优化
- ⚡ **高性能**: 全面的性能优化和资源管理
- 🔧 **易用性**: 简单易用的 API 和丰富的配置选项

让浏览器自动化真正达到接近人类操作的智能化水平！
