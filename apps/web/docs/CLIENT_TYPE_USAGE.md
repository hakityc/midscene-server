# Web 端客户端类型（ClientType）使用指南

## 概述

Web 调试页面现已支持选择目标客户端类型，可以方便地切换消息发送到 **Web 端**或 **Windows 端**。这使得在同一个界面中测试不同平台的功能成为可能。

**更新日期：** 2025-10-13

## 快速开始

### 1. 打开调试页面

访问 Web 调试页面：`http://localhost:5173`（或你的开发服务器地址）

### 2. 选择客户端类型

在"消息元数据"部分，你会看到新增的"客户端类型"选择器：

```
┌─────────────────────────────────┐
│ 消息元数据                      │
├─────────────────────────────────┤
│ 客户端类型 📱/🖥️               │
│ ┌─────────────────────────────┐ │
│ │ 自动（Web） ▼              │ │
│ └─────────────────────────────┘ │
│   • 自动（Web）- 默认选项      │
│   • Web 端 - 浏览器自动化      │
│   • Windows 端 - 桌面自动化    │
└─────────────────────────────────┘
```

### 3. 发送消息

选择目标客户端类型后，点击"发送消息"按钮，消息将路由到相应的处理器。

## 客户端类型说明

### 自动（Web）[默认]

- **含义：** 不在消息中指定 `clientType` 字段
- **行为：** 服务端自动识别为 Web 端
- **适用场景：** 日常 Web 端测试
- **图标：** 📱 Smartphone

**消息示例：**

```json
{
  "meta": {
    "messageId": "xxx",
    "conversationId": "yyy",
    "timestamp": 1697184000000
    // 注意：没有 clientType 字段
  },
  "payload": {
    "action": "ai",
    "params": "点击搜索按钮"
  }
}
```

### Web 端

- **含义：** 明确指定 `clientType: 'web'`
- **行为：** 使用 Web 端处理器（WebOperateService）
- **适用场景：** 需要明确指定 Web 端，或与其他类型对比测试
- **图标：** 📱 Smartphone

**支持的操作：**

- ✅ AI 执行
- ✅ AI 脚本
- ✅ 连接标签页
- ✅ 下载视频
- ✅ 站点脚本
- ✅ 服务命令

**消息示例：**

```json
{
  "meta": {
    "messageId": "xxx",
    "conversationId": "yyy",
    "timestamp": 1697184000000,
    "clientType": "web"
  },
  "payload": {
    "action": "ai",
    "params": "点击搜索按钮"
  }
}
```

### Windows 端

- **含义：** 指定 `clientType: 'windows'`
- **行为：** 使用 Windows 端处理器（WindowsOperateService）
- **适用场景：** 测试 Windows 桌面应用自动化
- **图标：** 🖥️ Monitor

**支持的操作：**

- ✅ AI 执行
- ✅ AI 脚本
- ✅ 服务命令

**消息示例：**

```json
{
  "meta": {
    "messageId": "xxx",
    "conversationId": "yyy",
    "timestamp": 1697184000000,
    "clientType": "windows"
  },
  "payload": {
    "action": "ai",
    "params": "打开记事本"
  }
}
```

## 使用场景

### 场景 1: 测试 Web 端功能

1. 选择"自动（Web）"或"Web 端"
2. 确保浏览器标签页已连接
3. 输入 AI 指令，如："点击登录按钮"
4. 发送消息

### 场景 2: 测试 Windows 端功能

1. 选择"Windows 端"（🖥️）
2. 确保 Windows 客户端已连接
3. 输入 AI 指令，如："打开记事本"
4. 发送消息

### 场景 3: 对比测试

你可以在同一会话中切换客户端类型，对比不同平台的行为：

1. 发送消息到 Web 端：`"在浏览器中搜索 AI"`
2. 切换到 Windows 端
3. 发送消息到 Windows 端：`"在文件资源管理器中搜索文件"`
4. 在消息监控面板中查看两个平台的响应

### 场景 4: 脚本执行

使用 AI Script 功能执行多步骤任务：

**Web 端脚本：**

```json
{
  "meta": {
    "clientType": "web"
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [{
        "name": "登录流程",
        "flow": [
          { "aiTap": "登录按钮" },
          { "aiInput": { "value": "user@example.com", "locate": "邮箱输入框" } },
          { "aiInput": { "value": "password123", "locate": "密码输入框" } },
          { "aiTap": "提交按钮" }
        ]
      }]
    }
  }
}
```

**Windows 端脚本：**

```json
{
  "meta": {
    "clientType": "windows"
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [{
        "name": "打开应用",
        "flow": [
          { "aiAction": "点击开始菜单" },
          { "aiAction": "搜索记事本" },
          { "aiAction": "打开记事本" }
        ]
      }]
    }
  }
}
```

## UI 交互说明

### 客户端类型选择器

选择器提供三个选项，带有可视化图标：

```
┌────────────────────────┐
│ 📱 自动（Web）        │ ← 默认选项，不设置 clientType
├────────────────────────┤
│ 📱 Web 端              │ ← 明确设置 clientType: 'web'
├────────────────────────┤
│ 🖥️ Windows 端          │ ← 设置 clientType: 'windows'
└────────────────────────┘
```

### 视觉反馈

- **选中状态：** 客户端类型标签旁会显示对应的图标
- **消息预览：** JSON 预览面板会显示完整的消息结构（包含 clientType）
- **历史记录：** 消息历史会保留客户端类型信息

## 技术实现

### 类型定义

```typescript
// src/types/debug.ts

export type ClientType = 'web' | 'windows';

export interface MessageMeta {
  messageId: string;
  conversationId: string;
  timestamp: number;
  clientType?: ClientType; // 可选字段
}
```

### 消息构建

```typescript
// src/utils/messageBuilder.ts

export function generateMeta(
  conversationId?: string,
  clientType?: ClientType,
): MessageMeta {
  const meta: MessageMeta = {
    messageId: uuidv4(),
    conversationId: conversationId || uuidv4(),
    timestamp: Date.now(),
  };

  // 只在明确指定时才添加 clientType
  if (clientType) {
    meta.clientType = clientType;
  }

  return meta;
}
```

### UI 组件

```tsx
// src/components/debug/MetaForm.tsx

<Select
  value={meta.clientType || 'auto'}
  onValueChange={(value) => updateClientType(value as ClientType | 'auto')}
>
  <SelectContent>
    <SelectItem value="auto">自动（Web）</SelectItem>
    <SelectItem value="web">Web 端</SelectItem>
    <SelectItem value="windows">Windows 端</SelectItem>
  </SelectContent>
</Select>
```

## 最佳实践

### 1. 默认使用"自动"模式

对于日常 Web 端测试，使用"自动（Web）"模式即可，无需显式指定 `clientType`。

### 2. 明确指定用于文档和示例

在创建文档、示例或教程时，建议明确指定 `clientType`，让读者清楚知道目标平台。

### 3. 测试前确认连接状态

- **Web 端：** 确保浏览器标签页已通过扩展连接
- **Windows 端：** 确保 Windows 客户端应用已运行并连接

### 4. 使用模板快速切换

你可以为不同平台创建模板：

**Web 端模板：**

```json
{
  "name": "Web - 点击操作",
  "meta": { "clientType": "web" },
  "payload": { "action": "ai", "params": "点击按钮" }
}
```

**Windows 端模板：**

```json
{
  "name": "Windows - 打开应用",
  "meta": { "clientType": "windows" },
  "payload": { "action": "ai", "params": "打开应用" }
}
```

### 5. 查看消息监控

消息监控面板会显示：

- 发送的消息（包含 clientType）
- 服务端响应
- 错误信息（如连接断开）

## 故障排除

### 问题 1: Windows 端消息无响应

**可能原因：**

- Windows 客户端未连接
- WindowsOperateService 未启动

**解决方案：**

1. 检查 Windows 客户端连接状态
2. 发送 COMMAND 消息启动服务：

   ```json
   {
     "meta": { "clientType": "windows" },
     "payload": { "action": "command", "params": "start" }
   }
   ```

### 问题 2: 切换客户端类型后消息格式错误

**解决方案：**

1. 点击"刷新 Message ID"按钮
2. 检查 JSON 预览确认 clientType 正确
3. 重新发送消息

### 问题 3: 不确定应该选择哪个客户端类型

**判断标准：**

- 操作浏览器网页 → 选择 Web 端
- 操作 Windows 桌面应用 → 选择 Windows 端
- 混合场景 → 根据当前操作的目标选择

## 示例集合

### Web 端示例

#### 1. 基本点击操作

```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1697184000000,
    "clientType": "web"
  },
  "payload": {
    "action": "ai",
    "params": "点击搜索按钮"
  }
}
```

#### 2. 表单填写

```json
{
  "meta": { "clientType": "web" },
  "payload": {
    "action": "ai",
    "params": "在搜索框输入 'AI 技术'"
  }
}
```

#### 3. 站点脚本

```json
{
  "meta": { "clientType": "web" },
  "payload": {
    "action": "siteScript",
    "params": "console.log(document.title)"
  }
}
```

### Windows 端示例

#### 1. 打开应用

```json
{
  "meta": {
    "messageId": "msg_002",
    "conversationId": "conv_001",
    "timestamp": 1697184000000,
    "clientType": "windows"
  },
  "payload": {
    "action": "ai",
    "params": "打开记事本"
  }
}
```

#### 2. 文件操作

```json
{
  "meta": { "clientType": "windows" },
  "payload": {
    "action": "ai",
    "params": "在记事本中输入 Hello World"
  }
}
```

#### 3. 服务控制

```json
{
  "meta": { "clientType": "windows" },
  "payload": {
    "action": "command",
    "params": "start"
  }
}
```

### 脚本示例

#### Web 端完整流程

```json
{
  "meta": { "clientType": "web" },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "搜索任务",
          "continueOnError": false,
          "flow": [
            {
              "type": "aiTap",
              "locate": "搜索图标"
            },
            {
              "type": "aiInput",
              "value": "人工智能",
              "locate": "搜索输入框"
            },
            {
              "type": "aiKeyboardPress",
              "key": "Enter"
            },
            {
              "type": "aiWaitFor",
              "assertion": "搜索结果已显示"
            }
          ]
        }
      ]
    }
  }
}
```

#### Windows 端完整流程

```json
{
  "meta": { "clientType": "windows" },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "记事本操作",
          "continueOnError": false,
          "flow": [
            { "aiAction": "点击开始菜单" },
            { "aiAction": "搜索记事本" },
            { "aiAction": "打开记事本" },
            { "aiAction": "输入 Hello World" },
            { "aiAction": "保存文件为 test.txt" }
          ]
        }
      ]
    }
  }
}
```

## 进阶用法

### 1. 编程方式使用

如果你在代码中使用消息构建器：

```typescript
import { generateMeta, buildAiMessage } from '@/utils/messageBuilder';

// Web 端消息
const webMeta = generateMeta(conversationId, 'web');
const webMessage = buildAiMessage('点击按钮', webMeta);

// Windows 端消息
const windowsMeta = generateMeta(conversationId, 'windows');
const windowsMessage = buildAiMessage('打开记事本', windowsMeta);
```

### 2. 批量测试

创建测试套件，自动切换客户端类型：

```typescript
const testCases = [
  { clientType: 'web', action: '点击登录' },
  { clientType: 'windows', action: '打开设置' },
  { clientType: 'web', action: '提交表单' },
];

for (const test of testCases) {
  const meta = generateMeta(conversationId, test.clientType);
  const message = buildAiMessage(test.action, meta);
  await sendMessage(message);
}
```

### 3. 条件路由

根据特定条件自动选择客户端类型：

```typescript
function getClientType(action: string): ClientType {
  if (action.includes('浏览器') || action.includes('网页')) {
    return 'web';
  }
  if (action.includes('桌面') || action.includes('应用')) {
    return 'windows';
  }
  return 'web'; // 默认
}

const clientType = getClientType(userInput);
const meta = generateMeta(conversationId, clientType);
```

## 相关文档

- [WINDOWS_SERVICE_INTEGRATION.md](../../server/docs/WINDOWS_SERVICE_INTEGRATION.md) - Windows Service 接入文档
- [CLIENT_TYPE_FEATURE.md](../../server/docs/CLIENT_TYPE_FEATURE.md) - 服务端客户端类型功能
- [ACTIONS_ARCHITECTURE.md](../../server/docs/ACTIONS_ARCHITECTURE.md) - Actions 架构设计

## 总结

Web 调试页面的客户端类型选择功能让你能够：

- ✅ 在同一界面测试 Web 和 Windows 功能
- ✅ 方便地切换目标平台
- ✅ 对比不同平台的行为
- ✅ 创建跨平台测试套件
- ✅ 使用可视化界面快速调试

这大大简化了多平台测试的工作流程！

---

**维护者：** 开发团队  
**最后更新：** 2025-10-13  
**状态：** ✅ 生产就绪
