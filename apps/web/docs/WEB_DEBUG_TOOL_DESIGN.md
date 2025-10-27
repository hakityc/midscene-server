# Web 调试工具设计方案

## 一、现状分析

### 当前痛点

- 使用 Apifox 需要手写复杂的 JSON 结构
- 参数嵌套层级深，容易出错
- 无法可视化地构建 flow 流程
- 调试效率低，需要频繁复制粘贴

### Server 支持的 Action 类型

根据代码分析，server 支持以下 WebSocket Actions：

```typescript
enum WebSocketAction {
  CONNECT_TAB = 'connectTab',      // 连接标签页
  AI = 'ai',                        // AI 简单请求
  AI_SCRIPT = 'aiScript',          // AI 脚本执行（复杂任务流）
  AGENT = 'agent',                 // Agent 执行
  SITE_SCRIPT = 'siteScript',      // 网站脚本执行
  DOWNLOAD_VIDEO = 'downloadVideo', // 下载视频
  COMMAND = 'command',             // 命令执行
}
```

### 消息结构

```typescript
interface WsInboundMessage {
  meta: {
    messageId: string;
    conversationId: string;
    timestamp: number;
  };
  payload: {
    action: string;
    params: any;
    site?: string;
    originalCmd?: string;
    option?: string;  // 例如 "LOADING_SHADE"
  };
}
```

## 二、设计方案

### 方案选择：**混合模式**

结合表单构建器和 JSON 编辑器的优点：

#### 1. **模板 + 表单模式**（推荐用于常用场景）

- 为每个 Action 类型提供预设模板
- 使用可视化表单构建复杂的 flow
- 自动生成 JSON

#### 2. **JSON 编辑模式**（用于高级场景）

- 保留当前的 JSON 编辑器
- 提供语法高亮和验证
- 支持从模板快速开始

### 核心功能设计

#### 功能 1：Action 选择器

- 下拉选择框选择 Action 类型
- 每个 Action 显示说明文档
- 自动切换到对应的参数表单

#### 功能 2：动态参数表单

##### 2.1 AI Script 构建器（重点）

```
[任务列表]
  └─ 任务 1
       ├─ 名称: "搜索文档"
       ├─ 失败时继续: [✓]
       └─ 动作流程
            ├─ [+ 添加动作]
            ├─ 动作 1: aiTap
            │    ├─ 描述: "搜索图标"
            │    └─ XPath (可选): "//*[@id='...']"
            ├─ 动作 2: aiInput
            │    ├─ 输入内容: "搜索内容"
            │    ├─ 定位描述: "搜索输入框"
            │    └─ XPath (可选): "//*[@id='...']"
            └─ 动作 3: sleep
                 └─ 延迟(ms): 2000
```

**支持的动作类型**：

- `aiTap`: AI 点击
  - 必填：描述
  - 可选：xpath
- `aiInput`: AI 输入
  - 必填：输入内容、定位描述
  - 可选：xpath
- `aiAssert`: AI 断言
  - 必填：断言描述
- `sleep`: 等待
  - 必填：延迟时间(ms)
- `aiHover`: AI 悬停
  - 必填：描述
  - 可选：xpath
- `aiScroll`: AI 滚动
  - 必填：方向、滚动类型
  - 可选：距离、定位描述
- `aiWaitFor`: AI 等待条件
  - 必填：条件描述
  - 可选：超时时间、检查间隔
- `aiKeyboardPress`: AI 按键
  - 必填：按键
  - 可选：定位描述

##### 2.2 其他 Action 表单

**AI (简单请求)**

- 参数输入框（纯文本）

**Site Script (网站脚本)**

- 脚本内容（多行文本）
- 原始命令（可选）

**Download Video (下载视频)**

- 视频 URL
- 保存路径（可选）

#### 功能 3：元数据管理

- 自动生成：messageId（UUID）、timestamp
- 手动输入：conversationId（支持记忆上次使用的值）

#### 功能 4：选项配置

- 复选框：启用 Loading 遮罩（LOADING_SHADE）
- 其他选项（预留扩展）

#### 功能 5：预设模板库

常用场景快速开始：

- 搜索并点击第一个结果
- 表单填写
- 列表滚动加载
- 弹窗关闭
- 自定义模板保存

#### 功能 6：实时 JSON 预览

- 分屏显示：表单 | JSON
- JSON 可编辑（同步回表单）
- 语法高亮、格式化

#### 功能 7：历史记录

- 保存最近 10 次发送的消息
- 支持快速加载历史消息
- LocalStorage 持久化

#### 功能 8：响应监控

- 实时显示 WebSocket 消息
- 消息类型分类（发送/接收/错误）
- 时间戳、状态、内容
- 支持筛选和搜索

## 三、UI 布局设计

### 3.1 整体布局（左右分栏）

```
┌────────────────────────────────────────────────────────┐
│  Midscene Debug Tool                       [历史记录]   │
├─────────────────────┬──────────────────────────────────┤
│                     │                                  │
│  [构建器模式]        │  [消息监控]                       │
│                     │                                  │
│  1. Action 选择     │  ● 2024-01-01 10:00:00          │
│  ├─ AI Script ▾    │  ← {"meta": {...}}               │
│                     │                                  │
│  2. 参数配置        │  ● 2024-01-01 10:00:01          │
│  ├─ 任务列表        │  → {"meta": {...}, "payload": {}}│
│  │  ├─ 任务 1       │                                  │
│  │  │  ├─ 名称      │  ✓ 处理完成                      │
│  │  │  └─ 动作流程  │                                  │
│  │  │     ├─ aiTap │  [清空] [导出]                   │
│  │  │     └─ sleep  │                                  │
│  │  └─ [+新任务]   │                                  │
│                     │                                  │
│  3. 元数据          │                                  │
│  ├─ Conversation ID│                                  │
│  └─ Message ID     │                                  │
│                     │                                  │
│  4. 选项            │                                  │
│  ☑ Loading 遮罩     │                                  │
│                     │                                  │
│  [JSON 模式切换]    │                                  │
│                     │                                  │
│  [发送]             │                                  │
│                     │                                  │
├─────────────────────┴──────────────────────────────────┤
│  连接状态: ● 已连接   ws://localhost:3000/ws           │
└────────────────────────────────────────────────────────┘
```

### 3.2 移动端适配

垂直单栏布局，Tab 切换：

- Tab 1: 构建器
- Tab 2: 监控
- Tab 3: 历史

## 四、技术实现

### 4.1 技术栈

- **UI 框架**: React + TypeScript
- **样式**: Tailwind CSS（保持现有 brutalist 风格）
- **表单管理**: React Hook Form
- **状态管理**: React Context/Zustand（选一个）
- **JSON 编辑**: Monaco Editor / react-json-view
- **UUID 生成**: uuid
- **持久化**: LocalStorage

### 4.2 新增依赖建议

```json
{
  "dependencies": {
    "react-hook-form": "^7.x",
    "uuid": "^9.x",
    "@monaco-editor/react": "^4.x",  // 或 react-json-view
    "date-fns": "^3.x"  // 时间格式化
  }
}
```

### 4.3 目录结构

```
src/
├── pages/
│   └── midsceneDebugPage.tsx  (改造)
├── components/
│   ├── ui/  (现有组件)
│   └── debug/  (新增)
│       ├── ActionSelector.tsx
│       ├── ParamsForm/
│       │   ├── AiScriptForm.tsx
│       │   ├── FlowBuilder.tsx
│       │   ├── ActionItem.tsx
│       │   └── ...
│       ├── MetaForm.tsx
│       ├── OptionsForm.tsx
│       ├── MessageMonitor.tsx
│       ├── HistoryPanel.tsx
│       └── JsonPreview.tsx
├── hooks/
│   ├── useWebSocket.ts
│   ├── useMessageHistory.ts
│   └── useFormBuilder.ts
├── types/
│   └── debug.ts  (Action 类型定义)
└── utils/
    ├── messageBuilder.ts
    └── templates.ts
```

## 五、开发计划

### Phase 1: 基础架构（1-2 天）

- [ ] 重构 WebSocket 连接管理
- [ ] 设计类型系统
- [ ] 实现布局框架
- [ ] 消息监控面板

### Phase 2: 核心功能（2-3 天）

- [ ] Action 选择器
- [ ] AI Script 构建器
- [ ] Flow 动作管理（增删改）
- [ ] 实时 JSON 生成

### Phase 3: 增强功能（1-2 天）

- [ ] 其他 Action 表单
- [ ] 模板系统
- [ ] 历史记录
- [ ] JSON 模式切换

### Phase 4: 优化（1 天）

- [ ] 表单验证
- [ ] 错误处理
- [ ] 移动端适配
- [ ] 快捷键支持

## 六、优势对比

| 特性 | Apifox | 新工具 |
|------|--------|--------|
| JSON 编辑 | ✓ | ✓ |
| 可视化构建 | ✗ | ✓ |
| 实时预览 | ✗ | ✓ |
| 模板库 | ✗ | ✓ |
| 历史记录 | ✓ | ✓ |
| 响应监控 | ✓ | ✓ |
| 类型提示 | ✗ | ✓ |
| 上下文集成 | ✗ | ✓ |

## 七、后续扩展

1. **模板市场**：社区共享常用脚本
2. **录制功能**：录制浏览器操作自动生成 flow
3. **变量系统**：支持参数化测试
4. **批量执行**：一次运行多个任务
5. **性能分析**：任务执行时间统计
6. **导入导出**：支持导入 Postman/Apifox 配置

---

## 下一步

等待你的确认后，我将开始实施：

1. 先实现 Phase 1 的基础架构
2. 重点开发 AI Script 构建器（最常用）
3. 逐步完善其他功能

是否开始开发？或者你有其他建议？
