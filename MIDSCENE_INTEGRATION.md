# Midscene 集成使用指南

## 概述

本项目成功集成了 `@midscene/core` 的功能到 `browserAgent` 中，提供了更智能的浏览器自动化能力。

## 集成架构

### 1. 核心组件

- **MidsceneWrapper** (`src/mastra/agents/modules/midscene-wrapper.ts`): 封装 Midscene 核心功能
- **MidsceneTools** (`src/mastra/tools/midscene-tools.ts`): 使用 Mastra 的 createTool 创建的工具集合
- **MidsceneToolExecutor** (`src/mastra/agents/modules/midscene-tool-executor.ts`): 工具执行器
- **Enhanced BrowserAgent** (`src/mastra/agents/modules/browser-agent.ts`): 增强的浏览器代理

### 2. 可用的 Midscene 工具

#### 智能元素定位
```typescript
// 工具 ID: midscene_locate_element
{
  "prompt": "登录按钮",
  "options": {
    "timeout": 5000,
    "retries": 3,
    "deepThink": true
  }
}
```

#### 页面描述和分析
```typescript
// 工具 ID: midscene_describe_page
// 无需参数，自动获取当前页面描述
```

#### 页面内容查询
```typescript
// 工具 ID: midscene_query_content
{
  "prompt": "获取所有商品价格"
}
```

#### 页面状态验证
```typescript
// 工具 ID: midscene_assert_state
{
  "assertion": "页面已加载完成",
  "message": "页面加载失败"
}
```

#### 等待页面条件
```typescript
// 工具 ID: midscene_wait_for
{
  "condition": "搜索结果出现",
  "timeout": 30000
}
```

#### 获取页面上下文
```typescript
// 工具 ID: midscene_get_context
// 无需参数，获取详细页面上下文
```

## 使用方式

### 1. 通过 WebSocket 调用

```javascript
// 发送 Midscene 工具调用请求
const message = {
  message_id: "msg_123",
  content: {
    action: "midscene_tool_call",
    body: {
      toolId: "midscene_locate_element",
      parameters: {
        prompt: "搜索框",
        options: {
          timeout: 5000,
          deepThink: true
        }
      }
    }
  }
};

ws.send(JSON.stringify(message));
```

### 2. 通过 AI Agent 调用

AI Agent 会自动选择最合适的工具来完成任务：

```javascript
// 发送 AI 请求，Agent 会自动使用 Midscene 工具
const message = {
  message_id: "msg_124",
  content: {
    action: "ai",
    body: "在百度搜索'人工智能'"
  }
};

ws.send(JSON.stringify(message));
```

## 执行流程

### AI 增强的搜索任务流程
1. `midscene_describe_page()` - 分析当前页面
2. `midscene_locate_element("搜索框")` - 智能定位搜索框
3. `aiInput("关键词")` - 输入搜索内容
4. `aiKeyboardPress("Enter")` - 执行搜索
5. `midscene_wait_for("搜索结果出现")` - 等待结果加载

### AI 增强的表单填写流程
1. `midscene_get_context()` - 获取页面上下文
2. `midscene_locate_element("字段名")` - 定位表单字段
3. `aiInput("内容")` - 填写内容
4. 重复步骤 2-3 填写其他字段
5. `midscene_locate_element("提交按钮")` - 定位提交按钮
6. `aiTap("提交")` - 提交表单

## 优势特性

### 1. 智能元素定位
- 使用 AI 理解自然语言描述
- 支持模糊匹配和语义理解
- 比传统 CSS 选择器更准确

### 2. 页面智能分析
- 自动分析页面结构和内容
- 提供详细的页面描述
- 支持动态内容识别

### 3. 状态智能验证
- AI 驱动的状态检查
- 自然语言描述验证条件
- 自动重试和错误处理

### 4. 内容智能提取
- 使用 AI 理解查询意图
- 支持复杂的数据提取需求
- 结构化数据输出

## 配置要求

确保以下环境变量已正确设置：

```bash
# Midscene 模型配置
MIDSCENE_MODEL_NAME=your_model_name
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=your_base_url

# 可选配置
MIDSCENE_USE_QWEN_VL=true
MIDSCENE_CACHE=true
```

## 注意事项

1. **当前实现**: 由于 Midscene Agent 实例的复杂性，当前实现使用模拟数据，实际生产环境需要完整的 Midscene Agent 实例。

2. **工具优先级**: AI Agent 会优先使用 Midscene AI 工具，然后是传统 MCP 工具。

3. **错误处理**: 所有工具都包含完整的错误处理和重试机制。

4. **性能优化**: 工具执行器包含输入输出验证，确保数据安全。

## 扩展开发

要添加新的 Midscene 工具：

1. 在 `midscene-wrapper.ts` 中添加新方法
2. 在 `midscene-tools.ts` 中创建对应的 Mastra 工具
3. 在 `midscene-tool-executor.ts` 中注册新工具
4. 更新 prompt 指令以包含新工具的使用说明

这种集成方式充分利用了 Mastra 的 Agent 框架和 Midscene 的 AI 能力，提供了强大而灵活的浏览器自动化解决方案。
