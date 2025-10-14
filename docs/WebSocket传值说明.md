# WebSocket 传值说明

本文档详细说明 Midscene Server WebSocket 通信协议，包括消息结构、Action 类型、参数格式以及响应规范。

## 📋 目录

- [概述](#概述)
- [消息结构](#消息结构)
- [客户端类型](#客户端类型)
- [Action 类型](#action-类型)
- [Web 端 Actions](#web-端-actions)
- [Windows 端 Actions](#windows-端-actions)
- [消息示例](#消息示例)
- [错误处理](#错误处理)

---

## 概述

### 连接信息

- **WebSocket 地址**: `ws://localhost:3000/ws`
- **协议**: WebSocket
- **消息格式**: JSON

### 通信流程

```
客户端                     服务器
  |                          |
  |-- 1. 连接 WebSocket ----->|
  |                          |
  |<--- 2. 欢迎消息 ----------|
  |                          |
  |-- 3. 发送请求消息 ------->|
  |                          |
  |<--- 4. 响应消息 ----------|
  |<--- 5. 回调消息（可选）---|
  |                          |
```

---

## 消息结构

### 入站消息（客户端 → 服务器）

**类型定义**:

```typescript
interface WsInboundMessage<P = unknown> {
  meta: {
    messageId: string;        // 消息唯一标识（UUID）
    conversationId: string;   // 会话 ID（关联同一对话的多个消息）
    timestamp: number;        // 时间戳（秒级 Unix 时间戳）
    clientType?: 'web' | 'windows';  // 客户端类型，默认为 'web'
  };
  payload: {
    action: string;           // Action 类型（见 Action 类型章节）
    params: P;                // Action 参数（类型根据 action 而定）
    site?: string;            // 站点 URL（可选）
    originalCmd?: string;     // 原始命令（可选）
    option?: string;          // 选项标志（如 'LOADING_SHADE'）
  };
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| `meta.messageId` | string | ✅ | 消息唯一标识，推荐使用 UUID v4 |
| `meta.conversationId` | string | ✅ | 会话 ID，同一对话使用相同 ID |
| `meta.timestamp` | number | ✅ | Unix 时间戳（秒），如 `1672531199` |
| `meta.clientType` | string | ❌ | 客户端类型，`'web'` 或 `'windows'`，默认 `'web'` |
| `payload.action` | string | ✅ | 要执行的 Action 类型 |
| `payload.params` | any | ✅ | Action 参数，格式依 action 而定 |
| `payload.site` | string | ❌ | 目标站点 URL |
| `payload.originalCmd` | string | ❌ | 原始命令文本 |
| `payload.option` | string | ❌ | 选项标志，如 `'LOADING_SHADE'` 显示遮罩 |

### 出站消息（服务器 → 客户端）

**类型定义**:

```typescript
interface WsOutboundMessage<R = unknown> {
  meta: {
    messageId: string;        // 对应请求的 messageId
    conversationId: string;   // 对应请求的 conversationId
    timestamp: number;        // 响应时间戳（秒级）
  };
  payload: {
    action: string;           // 对应的 Action 类型
    status: 'success' | 'failed';  // 执行状态
    result?: R;               // 成功时的结果
    error?: string;           // 失败时的错误信息
  };
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|-----|------|------|
| `meta.messageId` | string | 复用请求的 messageId |
| `meta.conversationId` | string | 复用请求的 conversationId |
| `meta.timestamp` | number | 服务器响应时间戳（秒） |
| `payload.action` | string | 对应的 Action 类型或特殊类型（如 `callback`） |
| `payload.status` | string | `'success'` 或 `'failed'` |
| `payload.result` | any | 成功时返回的结果数据 |
| `payload.error` | string | 失败时返回的错误消息 |

---

## 客户端类型

Server 支持两种客户端类型，每种类型支持不同的 Action 集合。客户端类型通过 `meta.clientType` 字段指定。

### Web 客户端

```json
{
  "meta": {
    "clientType": "web"
  }
}
```

- **默认类型**: 如果不指定 `clientType`，默认为 `web`
- **用途**: 浏览器自动化、网页操作
- **支持的 Actions**: 见 [Web 端 Actions](#web-端-actions)

### Windows 客户端

```json
{
  "meta": {
    "clientType": "windows"
  }
}
```

- **用途**: Windows 桌面应用自动化
- **支持的 Actions**: 见 [Windows 端 Actions](#windows-端-actions)

---

## Action 类型

### 完整 Action 枚举

```typescript
enum WebSocketAction {
  // Web 端专用
  CONNECT_TAB = 'connectTab',          // 连接浏览器标签页
  DOWNLOAD_VIDEO = 'downloadVideo',    // 下载视频
  SITE_SCRIPT = 'siteScript',          // 执行网页脚本
  
  // 通用 Actions（Web 和 Windows 都支持）
  AI = 'ai',                           // AI 自然语言指令
  AI_SCRIPT = 'aiScript',              // AI YAML 脚本
  COMMAND = 'command',                 // 服务命令
  
  // Windows 端专用
  TEST = 'test',                       // 测试命令
  
  // 系统回调
  CALLBACK = 'callback',               // 通用回调
  CALLBACK_AI_STEP = 'aiCallbackStep', // AI 步骤回调
  ERROR = 'error',                     // 错误
}
```

---

## Web 端 Actions

Web 客户端（`clientType: 'web'`）支持以下 Actions：

### 1. `connectTab` - 连接浏览器标签页

**描述**: 连接到指定的浏览器标签页。

**请求参数**:

```typescript
{
  tabId: string;  // 标签页 ID
}
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1672531199,
    "clientType": "web"
  },
  "payload": {
    "action": "connectTab",
    "params": {
      "tabId": "tab_12345"
    }
  }
}
```

**响应示例**:

```json
{
  "meta": {
    "messageId": "msg_001",
    "conversationId": "conv_001",
    "timestamp": 1672531200
  },
  "payload": {
    "action": "connectTab",
    "status": "success",
    "result": "已成功连接到标签页 tab_12345"
  }
}
```

---

### 2. `ai` - AI 自然语言指令

**描述**: 执行单一的 AI 自然语言指令。

**请求参数**:

```typescript
string  // 自然语言指令文本
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_002",
    "conversationId": "conv_001",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "ai",
    "params": "点击搜索按钮，然后输入'Midscene'"
  }
}
```

**响应示例**:

```json
{
  "meta": {
    "messageId": "msg_002",
    "conversationId": "conv_001",
    "timestamp": 1672531210
  },
  "payload": {
    "action": "ai",
    "status": "success",
    "result": "AI 处理完成"
  }
}
```

**回调消息**:

在执行过程中，Server 会发送步骤回调：

```json
{
  "meta": {
    "messageId": "msg_002",
    "conversationId": "conv_001",
    "timestamp": 1672531205
  },
  "payload": {
    "action": "aiCallbackStep",
    "status": "success",
    "result": {
      "data": "正在执行：点击搜索按钮",
      "meta": {
        "stage": "executing",
        "stepIndex": 1
      }
    }
  }
}
```

---

### 3. `aiScript` - AI YAML 脚本

**描述**: 执行结构化的 AI 任务脚本，支持多任务、多步骤流程。

**请求参数**:

```typescript
{
  tasks: Array<{
    name: string;                    // 任务名称
    continueOnError?: boolean;       // 失败时是否继续
    flow: Array<{
      // 动作类型（见下方动作类型）
    }>;
  }>;
}
```

**支持的动作类型**:

| 动作类型 | 说明 | 参数 |
|---------|------|------|
| `aiTap` | AI 点击 | `{ locate: string; xpath?: string }` |
| `aiInput` | AI 输入 | `{ locate: string; value: string; xpath?: string }` |
| `aiAssert` | AI 断言 | `{ assertion: string }` |
| `sleep` | 等待 | `{ timeMs: number }` |
| `aiHover` | AI 悬停 | `{ locate: string; xpath?: string }` |
| `aiScroll` | AI 滚动 | `{ direction: string; scrollType: string; distance?: number; locate?: string }` |
| `aiWaitFor` | AI 等待条件 | `{ assertion: string; timeoutMs?: number; checkIntervalMs?: number }` |
| `aiKeyboardPress` | AI 按键 | `{ key: string; locate?: string }` |

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_003",
    "conversationId": "conv_001",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "搜索文档",
          "continueOnError": false,
          "flow": [
            {
              "aiTap": {
                "locate": "搜索图标"
              }
            },
            {
              "aiInput": {
                "locate": "搜索输入框",
                "value": "Midscene 使用教程"
              }
            },
            {
              "sleep": {
                "timeMs": 2000
              }
            },
            {
              "aiAssert": {
                "assertion": "页面包含搜索结果"
              }
            }
          ]
        }
      ]
    },
    "option": "LOADING_SHADE"
  }
}
```

**响应示例（成功）**:

```json
{
  "meta": {
    "messageId": "msg_003",
    "conversationId": "conv_001",
    "timestamp": 1672531220
  },
  "payload": {
    "action": "aiScript",
    "status": "success",
    "result": {
      "message": "aiScript 处理完成",
      "result": {
        "tasks": [
          {
            "name": "搜索文档",
            "status": "completed"
          }
        ]
      },
      "hasErrors": false
    }
  }
}
```

**响应示例（部分失败）**:

```json
{
  "meta": {
    "messageId": "msg_003",
    "conversationId": "conv_001",
    "timestamp": 1672531220
  },
  "payload": {
    "action": "aiScript",
    "status": "success",
    "result": {
      "message": "aiScript 处理完成 (⚠️ 部分任务执行失败: 搜索文档: 未找到元素)",
      "result": {},
      "hasErrors": true,
      "taskErrors": [
        {
          "taskName": "搜索文档",
          "error": {
            "message": "未找到元素：搜索图标"
          }
        }
      ]
    }
  }
}
```

---

### 4. `downloadVideo` - 下载视频

**描述**: 下载指定 URL 的视频资源。

**请求参数**:

```typescript
{
  url: string;         // 视频 URL
  outputPath?: string; // 输出路径（可选）
}
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_004",
    "conversationId": "conv_001",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "downloadVideo",
    "params": {
      "url": "https://example.com/video.mp4",
      "outputPath": "./downloads/video.mp4"
    }
  }
}
```

---

### 5. `siteScript` - 执行网页脚本

**描述**: 在当前网页上下文中执行 JavaScript 代码。

**请求参数**:

```typescript
string  // JavaScript 代码
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_005",
    "conversationId": "conv_001",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "siteScript",
    "params": "document.title = 'New Title'; return document.title;"
  }
}
```

**响应示例**:

```json
{
  "meta": {
    "messageId": "msg_005",
    "conversationId": "conv_001",
    "timestamp": 1672531200
  },
  "payload": {
    "action": "siteScript",
    "status": "success",
    "result": "New Title"
  }
}
```

---

### 6. `command` - 服务命令

**描述**: 控制 Web 服务的生命周期（启动、停止等）。

**请求参数**:

```typescript
{
  command: 'start' | 'stop' | 'restart';
}
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_006",
    "conversationId": "conv_001",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "command",
    "params": {
      "command": "restart"
    }
  }
}
```

---

## Windows 端 Actions

Windows 客户端（`clientType: 'windows'`）支持以下 Actions：

### 1. `ai` - Windows AI 指令

**描述**: 在 Windows 桌面环境执行 AI 自然语言指令。

**请求参数**:

```typescript
string  // 自然语言指令文本
```

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_101",
    "conversationId": "conv_win_001",
    "timestamp": 1672531199,
    "clientType": "windows"
  },
  "payload": {
    "action": "ai",
    "params": "打开记事本并输入 Hello World"
  }
}
```

---

### 2. `aiScript` - Windows AI 脚本

**描述**: 在 Windows 桌面环境执行结构化的 AI 任务脚本。

**请求格式**: 与 Web 端 `aiScript` 类似，但操作对象是 Windows 桌面应用。

**请求示例**:

```json
{
  "meta": {
    "messageId": "msg_102",
    "conversationId": "conv_win_001",
    "timestamp": 1672531199,
    "clientType": "windows"
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "打开并操作记事本",
          "flow": [
            {
              "aiTap": {
                "locate": "开始菜单"
              }
            },
            {
              "aiInput": {
                "locate": "搜索框",
                "value": "记事本"
              }
            },
            {
              "aiTap": {
                "locate": "记事本应用"
              }
            }
          ]
        }
      ]
    }
  }
}
```

---

### 3. `command` - Windows 服务命令

**描述**: 控制 Windows 客户端服务。

**请求参数**:

```typescript
{
  command: string;
}
```

---

### 4. `test` - 测试命令

**描述**: 测试 Windows 客户端服务的连通性和功能。

**请求参数**:

```typescript
{
  testType: string;
}
```

---

## 消息示例

### 完整的对话示例

#### 1. 连接建立

**客户端 → 服务器**: （建立 WebSocket 连接）

**服务器 → 客户端**: （欢迎消息）

```json
{
  "meta": {
    "messageId": "welcome_1672531190",
    "conversationId": "system",
    "timestamp": 1672531190
  },
  "payload": {
    "action": "callback",
    "status": "success",
    "result": "{\"connectionId\":\"conn_1672531190_abc123\",\"message\":\"连接已建立\",\"serverTime\":\"2023-01-01T00:00:00.000Z\"}"
  }
}
```

#### 2. 执行 AI 脚本

**客户端 → 服务器**:

```json
{
  "meta": {
    "messageId": "msg_search_001",
    "conversationId": "conv_search",
    "timestamp": 1672531199
  },
  "payload": {
    "action": "aiScript",
    "params": {
      "tasks": [
        {
          "name": "百度搜索",
          "continueOnError": false,
          "flow": [
            {
              "aiTap": {
                "locate": "搜索框"
              }
            },
            {
              "aiInput": {
                "locate": "搜索框",
                "value": "Midscene"
              }
            },
            {
              "aiKeyboardPress": {
                "key": "Enter"
              }
            },
            {
              "aiWaitFor": {
                "assertion": "搜索结果已加载",
                "timeoutMs": 5000
              }
            },
            {
              "aiAssert": {
                "assertion": "页面包含搜索结果"
              }
            }
          ]
        }
      ]
    },
    "option": "LOADING_SHADE"
  }
}
```

**服务器 → 客户端**: （步骤回调 1）

```json
{
  "meta": {
    "messageId": "msg_search_001",
    "conversationId": "conv_search",
    "timestamp": 1672531201
  },
  "payload": {
    "action": "aiCallbackStep",
    "status": "success",
    "result": {
      "data": "正在执行：点击搜索框",
      "meta": {
        "stage": "executing",
        "stepIndex": 0,
        "totalSteps": 5
      }
    }
  }
}
```

**服务器 → 客户端**: （步骤回调 2）

```json
{
  "meta": {
    "messageId": "msg_search_001",
    "conversationId": "conv_search",
    "timestamp": 1672531203
  },
  "payload": {
    "action": "aiCallbackStep",
    "status": "success",
    "result": {
      "data": "正在执行：输入 Midscene",
      "meta": {
        "stage": "executing",
        "stepIndex": 1,
        "totalSteps": 5
      }
    }
  }
}
```

**服务器 → 客户端**: （最终响应）

```json
{
  "meta": {
    "messageId": "msg_search_001",
    "conversationId": "conv_search",
    "timestamp": 1672531220
  },
  "payload": {
    "action": "aiScript",
    "status": "success",
    "result": {
      "message": "aiScript 处理完成",
      "result": {
        "tasks": [
          {
            "name": "百度搜索",
            "status": "completed"
          }
        ]
      },
      "hasErrors": false
    }
  }
}
```

---

## 错误处理

### 错误响应格式

当操作失败时，服务器返回以下格式：

```json
{
  "meta": {
    "messageId": "msg_xxx",
    "conversationId": "conv_xxx",
    "timestamp": 1672531200
  },
  "payload": {
    "action": "ai",
    "status": "failed",
    "error": "AI 处理失败: 未找到元素：搜索按钮"
  }
}
```

### 常见错误类型

| 错误类型 | `payload.error` 前缀 | 说明 |
|---------|---------------------|------|
| 解析错误 | `消息解析失败:` | JSON 格式错误或字段缺失 |
| 未知 Action | `未知的 action 类型:` | Action 不存在或拼写错误 |
| Action 不支持 | `Action '...' 不支持 ... 端` | 客户端类型不支持该 Action |
| 连接错误 | `连接错误，正在尝试重连` | WebSocket 或 Agent 连接断开 |
| AI 处理失败 | `AI 处理失败:` | AI 执行过程中的各种错误 |
| 元素未找到 | `未找到元素:` | 页面元素定位失败 |
| 超时 | `timeout` | 操作超时 |

### 错误处理建议

1. **检查 `payload.status`**: 始终先检查状态是 `'success'` 还是 `'failed'`
2. **解析错误信息**: 从 `payload.error` 中提取错误详情
3. **重试策略**: 对于连接错误，建议实现重试机制
4. **日志记录**: 记录完整的请求和响应以便调试
5. **用户提示**: 向用户展示友好的错误消息

---

## 附录

### messageId 生成建议

```typescript
// 使用 UUID v4
import { v4 as uuidv4 } from 'uuid';
const messageId = uuidv4();

// 或使用时间戳 + 随机数
const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### conversationId 管理

```typescript
// 为每个对话会话生成唯一 ID
const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 同一对话中的所有消息使用相同的 conversationId
const messages = [
  { meta: { conversationId, messageId: 'msg_1', ... } },
  { meta: { conversationId, messageId: 'msg_2', ... } },
];
```

### timestamp 生成

```typescript
// 秒级 Unix 时间戳
const timestamp = Math.floor(Date.now() / 1000);
```

---

## 相关文档

- [Monorepo 使用指南](./Monorepo使用指南.md)
- [Action 验证系统](./ACTION_VALIDATION_SYSTEM.md)
- [FlowAction 配置化快速参考](./FlowAction配置化快速参考.md)

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| 1.0 | 2025-01-01 | 初始版本 |

