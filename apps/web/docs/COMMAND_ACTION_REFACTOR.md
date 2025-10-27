# Command Action 重构说明

## 概述

本次重构完成了以下主要工作：

1. **删除了视频下载相关逻辑** - 移除了 `downloadVideo` action 和相关组件
2. **新增了 Command 逻辑** - 支持 `start` 和 `stop` 两个命令参数，并为后续扩展预留了空间

## 修改文件列表

### 1. 类型定义 (`src/types/debug.ts`)

**删除:**

- `'downloadVideo'` 从 `WebSocketAction` 类型中移除
- `DownloadVideoParams` 接口完全删除

**新增:**

```typescript
export interface CommandParams {
  command: 'start' | 'stop' | string; // 支持 start, stop 及后续扩展
}
```

### 2. 组件更新

#### `src/components/debug/SimpleActionForms.tsx`

**删除:**

- `DownloadVideoForm` 组件及其接口

**新增:**

- `CommandForm` 组件 - 支持输入命令参数
  - 提供友好的 UI 提示当前支持的命令
  - 显示命令说明（start - 启动服务，stop - 停止服务）
  - 预留了扩展空间提示

#### `src/components/debug/ActionSelector.tsx`

**删除:**

- `downloadVideo` 选项

**更新:**

- 将 `command` 选项移至更合理的位置
- 更新描述为 "执行控制命令 (start, stop 等)"

### 3. 主页面 (`src/pages/midsceneDebugPage.tsx`)

**状态管理更新:**

删除的状态：

```typescript
const [videoUrl, setVideoUrl] = useState('');
const [videoSavePath, setVideoSavePath] = useState('');
```

新增的状态：

```typescript
const [command, setCommand] = useState('start');
```

**表单渲染更新:**

- 删除 `DownloadVideoForm` 的渲染逻辑
- 新增 `CommandForm` 的渲染：

```typescript
case 'command':
  return <CommandForm command={command} onChange={setCommand} />;
```

**消息构建更新:**

- 依赖项数组中用 `command` 替换了 `videoUrl` 和 `videoSavePath`
- JSON 表单同步处理 command 数据

**历史记录加载:**

- 添加对 `command` action 的历史记录恢复支持

### 4. 工具函数 (`src/utils/jsonParser.ts`)

**更新解析器:**

删除：

```typescript
videoUrl?: string;
videoSavePath?: string;
```

新增：

```typescript
params?: string;  // 用于通用参数
```

**解析逻辑:**

- 删除 `downloadVideo` case
- 新增 `command` case:

```typescript
case 'command': {
  result.params = payload.params as string;
  break;
}
```

### 5. 消息构建器 (`src/utils/messageBuilder.ts`)

已有的 `buildCommandScriptMessage` 函数保持不变：

```typescript
export function buildCommandScriptMessage(
  command: string,
  meta: MessageMeta,
): WsInboundMessage {
  return {
    meta,
    payload: {
      action: 'command',
      params: command,
    },
  };
}
```

## 功能说明

### Command Action 使用方式

1. **选择 Action 类型**: 在 Action Selector 中选择 "Command"
2. **输入命令**: 在 Command Form 中输入 `start` 或 `stop`
3. **发送消息**: 点击发送按钮

### 当前支持的命令

| 命令 | 说明 |
|------|------|
| `start` | 启动服务 |
| `stop` | 停止服务 |

### 扩展性设计

Command 参数类型设计为 `'start' | 'stop' | string`，这意味着：

- 当前明确支持 `start` 和 `stop`
- 可以轻松添加新的命令而无需修改类型定义
- 保持了类型安全的同时提供了灵活性

### 后续可扩展的命令示例

```typescript
// 未来可能的扩展
export interface CommandParams {
  command: 
    | 'start'      // 启动
    | 'stop'       // 停止
    | 'restart'    // 重启
    | 'pause'      // 暂停
    | 'resume'     // 恢复
    | 'status'     // 状态查询
    | string;      // 其他自定义命令
}
```

## 消息格式

### 请求消息格式

```json
{
  "meta": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "timestamp": 1234567890
  },
  "payload": {
    "action": "command",
    "params": "start"
  }
}
```

### 响应消息格式

```json
{
  "meta": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "timestamp": 1234567890
  },
  "payload": {
    "action": "command",
    "status": "success",
    "result": {
      "message": "服务已启动"
    }
  }
}
```

## 测试建议

### 手动测试步骤

1. **测试 start 命令**
   - 选择 Command action
   - 输入 "start"
   - 发送并验证响应

2. **测试 stop 命令**
   - 选择 Command action
   - 输入 "stop"
   - 发送并验证响应

3. **测试历史记录**
   - 发送 command 消息后
   - 检查历史记录是否正确保存
   - 从历史记录加载并验证表单状态

4. **测试 JSON 模式**
   - 切换到 JSON 模式
   - 验证 JSON 预览是否正确
   - 编辑 JSON 并验证表单同步

### 边界情况测试

- 空命令输入
- 不支持的命令（如 "test123"）
- 切换不同 action 类型时的状态保持
- 刷新页面后的状态恢复

## 注意事项

1. **后端支持**: 确保后端 WebSocket 服务已实现 `command` action 的处理逻辑
2. **错误处理**: 对于不支持的命令，后端应返回清晰的错误信息
3. **安全性**: 在生产环境中，command action 应该有适当的权限控制
4. **扩展命令**: 添加新命令时，记得同步更新 CommandForm 组件中的提示信息

## 代码质量

所有修改已通过：

- ✅ Biome 格式化检查
- ✅ Biome Lint 检查
- ✅ TypeScript 类型检查

## 下一步工作

1. **后端实现**: 确保后端正确处理 `command` action
2. **文档更新**: 更新 API 文档说明 command 的使用方式
3. **权限控制**: 添加 command action 的权限验证
4. **日志记录**: 记录所有 command 操作以便审计
5. **命令扩展**: 根据实际需求添加更多命令类型

## 相关文件

- 类型定义: `apps/web/src/types/debug.ts`
- 表单组件: `apps/web/src/components/debug/SimpleActionForms.tsx`
- 选择器组件: `apps/web/src/components/debug/ActionSelector.tsx`
- 主页面: `apps/web/src/pages/midsceneDebugPage.tsx`
- JSON 解析器: `apps/web/src/utils/jsonParser.ts`
- 消息构建器: `apps/web/src/utils/messageBuilder.ts`

## 迁移指南

如果有其他开发者正在使用 `downloadVideo` action，请参考以下迁移步骤：

1. **查找所有引用**: 搜索代码中所有 `downloadVideo` 的使用
2. **更新测试**: 删除或更新相关的测试用例
3. **清理历史数据**: 考虑清理用户本地存储中的 downloadVideo 历史记录
4. **通知用户**: 如果是面向用户的功能，需要提供迁移通知

---

**更新日期**: 2025-10-13  
**更新人**: AI Assistant  
**版本**: v1.0
