# JSON 与表单双向同步功能

## 功能概述

新增了 JSON 模式与表单模式之间的双向同步功能，用户可以：

- 在 JSON 模式中直接编辑 JSON，自动同步到表单
- 使用"粘贴 JSON"按钮快速从剪贴板导入 JSON 并更新表单
- 表单修改会自动反映到 JSON 预览中

## 核心功能

### 1. JSON 到表单解析

**文件**: `/Users/lebo/lebo/project/midscene-server/apps/web/src/utils/jsonParser.ts`

**主要功能**:

- 解析完整的 WebSocket 消息 JSON
- 提取并转换各种 Action 类型的参数
- 支持所有 Action 类型：`aiScript`, `ai`, `siteScript`, `downloadVideo`
- 智能解析流程动作和任务结构

**支持的解析内容**:

```typescript
// 元数据解析
{
  messageId: string;
  conversationId: string;
  timestamp: number;
}

// AI Script 解析
{
  action: 'aiScript';
  tasks: Task[];
  enableLoadingShade: boolean;
}

// AI 解析
{
  action: 'ai';
  aiPrompt: string;
}

// Site Script 解析
{
  action: 'siteScript';
  siteScript: string;
  siteScriptCmd: string;
}

// Download Video 解析
{
  action: 'downloadVideo';
  videoUrl: string;
  videoSavePath: string;
}
```

### 2. 流程动作解析

支持解析所有类型的流程动作：

```typescript
// AI 点击
{ aiTap: "按钮文本", xpath: "//button" }

// AI 输入
{ aiInput: "输入内容", locate: "输入框", xpath: "//input" }

// AI 断言
{ aiAssert: "检查条件" }

// 等待
{ sleep: 2000 }

// AI 悬停
{ aiHover: "元素", xpath: "//div" }

// AI 滚动
{ aiScroll: { direction: "down", distance: 100 } }

// AI 等待
{ aiWaitFor: "等待条件", timeoutMs: 15000 }

// AI 键盘
{ aiKeyboardPress: { key: "Enter", locate: "输入框" } }
```

### 3. JsonPreview 组件增强

**文件**: `/Users/lebo/lebo/project/midscene-server/apps/web/src/components/debug/JsonPreview.tsx`

**新增功能**:

- **编辑模式**: `editable={true}` 时支持直接编辑 JSON
- **粘贴功能**: "粘贴 JSON" 按钮快速从剪贴板导入
- **实时验证**: 编辑时实时验证 JSON 格式
- **自动同步**: 有效 JSON 自动同步到表单
- **错误提示**: 详细的错误信息和格式验证

**新增 Props**:

```typescript
interface JsonPreviewProps {
  message: WsInboundMessage;
  editable?: boolean;
  onEdit?: (message: WsInboundMessage) => void;
  onFormUpdate?: (formData: any) => void; // 新增：表单更新回调
}
```

### 4. 主页面集成

**文件**: `/Users/lebo/lebo/project/midscene-server/apps/web/src/pages/midsceneDebugPage.tsx`

**新增功能**:

- **双向同步**: JSON 修改自动更新表单状态
- **状态管理**: 智能更新各种 Action 类型的表单状态
- **错误处理**: 解析失败时的友好错误提示

**核心函数**:

```typescript
const handleJsonToFormUpdate = useCallback((formData: any) => {
  if (formData.action) setAction(formData.action);
  if (formData.meta) setMeta(formData.meta);
  
  // 根据 Action 类型更新相应的状态
  switch (formData.action) {
    case 'aiScript':
      if (formData.tasks) setTasks(formData.tasks);
      if (typeof formData.enableLoadingShade === 'boolean') {
        setEnableLoadingShade(formData.enableLoadingShade);
      }
      break;
    // ... 其他 Action 类型
  }
}, []);
```

## 使用方式

### 1. 从剪贴板导入 JSON

1. 复制一个完整的 WebSocket 消息 JSON 到剪贴板
2. 切换到 "JSON 模式" 标签页
3. 点击 "粘贴 JSON" 按钮
4. 系统会自动解析并更新表单

### 2. 直接编辑 JSON

1. 切换到 "JSON 模式" 标签页
2. 在文本框中直接编辑 JSON
3. 实时看到格式验证状态
4. 有效 JSON 会自动同步到表单

### 3. 表单到 JSON 同步

1. 在 "表单模式" 中修改各种参数
2. 切换到 "JSON 模式" 查看更新后的 JSON
3. 所有表单修改都会反映在 JSON 中

## 错误处理

### 1. JSON 格式验证

- **实时验证**: 编辑时实时检查 JSON 格式
- **结构验证**: 验证必需的字段（meta, payload, action）
- **类型验证**: 检查字段类型是否正确
- **友好提示**: 清晰的错误信息和修复建议

### 2. 解析错误处理

```typescript
{
  success: false,
  error: "JSON 格式无效：缺少 meta 或 payload 字段"
}
```

### 3. 用户界面反馈

- **状态指示**: 绿色"有效"或红色"无效"标识
- **错误显示**: 详细的错误信息面板
- **操作提示**: 清晰的使用说明和提示

## 技术特点

### 1. 类型安全

- 完整的 TypeScript 类型定义
- 运行时类型验证
- 智能类型推断

### 2. 性能优化

- 使用 `useCallback` 避免不必要的重渲染
- 智能的依赖管理
- 高效的 JSON 解析算法

### 3. 用户体验

- 实时反馈和验证
- 直观的操作界面
- 友好的错误提示
- 快捷的操作方式

### 4. 扩展性

- 模块化的解析器设计
- 易于添加新的 Action 类型支持
- 可配置的验证规则

## 示例用法

### 完整的 AI Script JSON

```json
{
  "meta": {
    "conversationId": "conv_123",
    "messageId": "msg_456",
    "timestamp": 1697123456789
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "搜索操作",
          "continueOnError": false,
          "flow": [
            {
              "aiTap": "搜索图标",
              "xpath": "//button[@id='search']"
            },
            {
              "aiInput": "搜索关键词",
              "locate": "搜索输入框",
              "xpath": "//input[@type='search']"
            },
            {
              "sleep": 2000
            },
            {
              "aiAssert": "搜索结果已显示"
            }
          ]
        }
      ]
    },
    "option": "LOADING_SHADE"
  }
}
```

这个 JSON 会被自动解析并填充到表单中，包括：

- 任务名称和配置
- 流程动作列表
- Loading 遮罩选项
- 元数据信息

## 总结

这个双向同步功能大大提升了调试效率，用户可以：

- 快速从现有 JSON 配置创建表单
- 在 JSON 和表单之间无缝切换
- 享受实时验证和错误提示
- 使用直观的粘贴功能快速导入配置

这使得调试工具更加灵活和易用，特别适合从 Apifox 等工具迁移过来的用户。
