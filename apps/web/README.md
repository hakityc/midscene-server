# Midscene Debug Tool

一个功能强大的可视化调试工具，用于调试 Midscene Server 的 WebSocket 指令。

## 🎯 功能特性

### ✨ 核心功能

1. **可视化构建器**
   - 支持 7 种 Action 类型：AI Script, AI (简单), Site Script, Download Video 等
   - AI Script 可视化流程构建，支持 8 种动作类型
   - 拖拽式界面，无需手写 JSON

2. **实时预览**
   - 表单模式 + JSON 模式双视图
   - 自动生成标准格式的消息
   - 实时验证 JSON 格式

3. **消息监控**
   - 实时显示 WebSocket 收发消息
   - 消息分类（发送/接收/成功/错误）
   - 点击展开查看详细 JSON
   - 导出消息记录

4. **历史记录**
   - 自动保存最近 10 条消息
   - 一键加载历史配置
   - LocalStorage 持久化

5. **快速模板**
   - 5 个预设模板：搜索并点击、表单填写、关闭弹窗、滚动加载、检查文本
   - 一键使用模板

## 🚀 快速开始

### 安装依赖

```bash
cd /Users/lebo/lebo/project/midscene-server/apps/web
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问：<http://localhost:5173>

### 启动 Server（必需）

在另一个终端启动 server：

```bash
cd /Users/lebo/lebo/project/midscene-server/apps/server
pnpm dev
```

Server 运行在：<http://localhost:3000>

## 📖 使用指南

### 1. 连接 WebSocket

- 页面加载时自动连接到 `ws://localhost:3000/ws`
- 右上角显示连接状态（绿色=已连接）

### 2. 选择 Action 类型

在下拉框中选择要执行的 Action：

- **AI Script**：复杂的多步骤任务流程（推荐）
- **AI (简单)**：单一 AI 指令
- **Site Script**：执行 JavaScript 代码
- **Download Video**：下载视频
- 其他...

### 3. 构建 AI Script（示例）

#### 添加任务

1. 点击「添加任务」按钮
2. 输入任务名称，如「搜索文档」
3. 勾选「失败时继续执行」（可选）

#### 添加动作

在任务中点击「添加动作」，选择动作类型：

**示例：搜索并点击第一个结果**

```
任务 1: 搜索文档
  ├─ 动作 1: aiTap
  │    └─ 描述: "搜索图标"
  ├─ 动作 2: aiInput
  │    ├─ 输入内容: "小飞小飞"
  │    └─ 定位描述: "搜索输入框"
  ├─ 动作 3: sleep
  │    └─ 延迟: 2000 ms
  ├─ 动作 4: aiAssert
  │    └─ 断言: "页面包含搜索结果"
  └─ 动作 5: aiTap
       └─ 描述: "第一个搜索结果"
```

### 4. 配置元数据

- **Conversation ID**：关联同一对话的多个消息（可复用）
- **Message ID**：自动生成，每条消息唯一
- **Timestamp**：自动生成

### 5. 发送消息

点击「发送消息」按钮，消息会：

1. 通过 WebSocket 发送到 server
2. 在右侧消息监控中显示
3. 自动保存到历史记录

### 6. 查看响应

在消息监控面板：

- 绿色：成功
- 红色：失败
- 蓝色：信息
- 点击消息展开查看完整 JSON

## 🎨 支持的动作类型

### AI Script 动作

| 动作类型 | 说明 | 必填参数 | 可选参数 |
|---------|------|---------|---------|
| `aiTap` | AI 点击 | 描述 | xpath |
| `aiInput` | AI 输入 | 输入内容、定位描述 | xpath |
| `aiAssert` | AI 断言 | 断言描述 | - |
| `sleep` | 等待 | 延迟时间(ms) | - |
| `aiHover` | AI 悬停 | 描述 | xpath |
| `aiScroll` | AI 滚动 | 方向、滚动类型 | 距离、定位、深度思考 |
| `aiWaitFor` | AI 等待条件 | 条件描述 | 超时、检查间隔 |
| `aiKeyboardPress` | AI 按键 | 按键 | 定位、深度思考 |

## 💡 实用技巧

### 使用模板快速开始

1. 点击右上角「显示历史」
2. 在「快速模板」面板选择模板
3. 点击「使用」按钮
4. 根据需要修改参数

### 复用历史配置

1. 点击「显示历史」
2. 找到之前的配置
3. 点击上传图标加载
4. 修改后重新发送

### JSON 模式调试

1. 切换到「JSON 模式」标签
2. 查看生成的完整 JSON
3. 点击「复制」按钮
4. 可以在 Apifox 或其他工具中使用

### 导出消息记录

1. 在消息监控面板点击「导出」
2. 下载 JSON 文件
3. 用于分析或分享

## 🔧 开发说明

### 目录结构

```
src/
├── components/
│   ├── ui/                    # 基础 UI 组件
│   └── debug/                 # 调试工具组件
│       ├── ActionSelector.tsx
│       ├── AiScriptForm.tsx
│       ├── TaskItem.tsx
│       ├── FlowActionItem.tsx
│       ├── SimpleActionForms.tsx
│       ├── MessageMonitor.tsx
│       ├── HistoryPanel.tsx
│       ├── TemplatePanel.tsx
│       ├── JsonPreview.tsx
│       └── MetaForm.tsx
├── hooks/
│   ├── useWebSocket.ts        # WebSocket 管理
│   └── useMessageHistory.ts   # 历史记录管理
├── types/
│   └── debug.ts               # 类型定义
├── utils/
│   ├── messageBuilder.ts      # 消息构建
│   └── templates.ts           # 模板定义
└── pages/
    └── midsceneDebugPage.tsx  # 主页面
```

### 技术栈

- **框架**: React 19 + TypeScript
- **UI**: Radix UI + Tailwind CSS (Brutalist 风格)
- **表单**: React Hook Form
- **状态**: React Hooks
- **工具**: uuid, date-fns

### 添加新模板

编辑 `src/utils/templates.ts`：

```typescript
{
  id: 'my-template',
  name: '我的模板',
  description: '模板描述',
  action: 'aiScript',
  message: {
    meta: generateMeta(),
    payload: {
      action: 'aiScript',
      params: {
        tasks: [
          // 你的任务配置
        ],
      },
    },
  },
}
```

## 📝 对比 Apifox

| 特性 | Apifox | Midscene Debug Tool |
|------|--------|---------------------|
| 可视化构建 | ❌ | ✅ |
| JSON 编辑 | ✅ | ✅ |
| 实时预览 | ❌ | ✅ |
| 模板系统 | ❌ | ✅ |
| 历史记录 | ✅ | ✅ |
| 响应监控 | ✅ | ✅ |
| 类型提示 | ❌ | ✅ |
| 学习曲线 | 中 | 低 |

## 🐛 常见问题

### 连接失败

- 确保 server 已启动：`cd apps/server && pnpm dev`
- 检查端口是否被占用
- 查看浏览器控制台错误

### 消息发送失败

- 检查 WebSocket 连接状态
- 查看右侧消息监控的错误信息
- 确认 server 日志

### JSON 格式错误

- 在 JSON 模式下查看具体错误
- 检查必填字段是否填写
- 参考模板的格式

## 📄 许可证

Private
