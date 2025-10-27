# ClientType Action 系统 - 快速参考卡片

## 🎯 一句话总结

服务端统一配置，Web 端自动同步，双端严格验证，确保不同平台使用正确的操作。

## 📋 支持的操作

### Web 端（6 个）

| Action | 名称 | 类别 |
|--------|------|------|
| `CONNECT_TAB` | 连接标签页 | 系统 |
| `AI` | AI 执行 | 基础 |
| `AI_SCRIPT` | AI 脚本 | 高级 |
| `DOWNLOAD_VIDEO` | 下载视频 | 高级 |
| `SITE_SCRIPT` | 站点脚本 | 高级 |
| `COMMAND` | 服务命令 | 系统 |

### Windows 端（3 个）

| Action | 名称 | 类别 |
|--------|------|------|
| `AI` | AI 执行 | 基础 |
| `AI_SCRIPT` | AI 脚本 | 高级 |
| `COMMAND` | 服务命令 | 系统 |

## 🚀 快速开始

### Web 端使用

```
1. 打开 http://localhost:5173
2. 选择客户端类型：📱 Web 端
3. 选择操作：从 6 个可用操作中选择
4. 填写参数并发送 ✅
```

### Windows 端使用

```
1. 打开 http://localhost:5173
2. 选择客户端类型：🖥️ Windows 端
3. 选择操作：从 3 个可用操作中选择
4. 填写参数并发送 ✅
```

## 📂 关键文件

### 配置文件（唯一数据源）

```
apps/server/src/config/clientTypeActions.ts
```

### API 接口

```
GET /api/client-type-actions              # 完整配置
GET /api/client-type-actions/web          # Web 配置
GET /api/client-type-actions/windows      # Windows 配置
```

### 核心组件

```
服务端: apps/server/src/routes/clientTypeActions.ts
Web 端: apps/web/src/components/debug/ActionSelector.tsx
Hook:  apps/web/src/hooks/useClientTypeActions.ts
```

## ⚡ 添加新 Action（3 步）

### 1. 编辑配置

```typescript
// apps/server/src/config/clientTypeActions.ts
export const CLIENT_TYPE_ACTIONS = {
  web: [
    {
      action: WebSocketAction.YOUR_ACTION,
      name: '你的功能',
      description: '功能描述',
      category: 'advanced',
    },
  ],
};
```

### 2. 实现并注册 Handler

```typescript
// apps/server/src/websocket/actions/yourAction.ts
export function createYourActionHandler(): MessageHandler { ... }

// apps/server/src/websocket/handlers/messageHandlers.ts
[WebSocketAction.YOUR_ACTION]: createYourActionHandler(),
```

### 3. 重启服务器

```bash
cd apps/server && pnpm dev
```

**✅ 完成！Web 端自动显示新 action！**

## 🔧 常用命令

```bash
# 启动服务端
cd apps/server && pnpm dev

# 启动 Web 端
cd apps/web && pnpm dev

# 测试 API
curl http://localhost:3000/api/client-type-actions

# 查看 Web 端配置
curl http://localhost:3000/api/client-type-actions/web

# 查看 Windows 端配置
curl http://localhost:3000/api/client-type-actions/windows
```

## 🐛 故障排除

### Web 端 ActionSelector 空白？

```bash
# 1. 确认服务端运行
curl http://localhost:3000/api/client-type-actions

# 2. 如果无响应，启动服务端
cd apps/server && pnpm dev

# 3. 刷新 Web 页面
```

### 消息被拒绝？

```
检查：
1. clientType 是否正确
2. action 是否在该类型的配置中
3. 查看服务端日志
```

### ActionSelector 显示警告？

```
说明：当前 action 不支持选择的 clientType
解决：
1. 选择其他支持的 action
2. 或切换到支持该 action 的 clientType
```

## 📖 文档索引

### 快速开始

- [CLIENT_TYPE_QUICK_START.md](apps/web/docs/CLIENT_TYPE_QUICK_START.md) - 30 秒上手

### 使用指南

- [CLIENT_TYPE_USAGE.md](apps/web/docs/CLIENT_TYPE_USAGE.md) - 详细用法
- [ACTION_SELECTOR_GUIDE.md](apps/web/docs/ACTION_SELECTOR_GUIDE.md) - 选择器指南

### 技术文档

- [CLIENT_TYPE_ACTION_VALIDATION.md](apps/server/docs/CLIENT_TYPE_ACTION_VALIDATION.md) - 验证系统
- [ACTION_CONFIG_REFERENCE.md](apps/server/docs/ACTION_CONFIG_REFERENCE.md) - 配置参考
- [ACTIONS_ARCHITECTURE.md](apps/server/docs/ACTIONS_ARCHITECTURE.md) - 架构设计

### 系统总览

- [ACTION_VALIDATION_SYSTEM.md](docs/ACTION_VALIDATION_SYSTEM.md) - 系统完整指南
- [FEATURE_SUMMARY.md](FEATURE_SUMMARY.md) - 功能总结（本项目根目录）

## 🎨 图标说明

| 图标 | 含义 |
|------|------|
| 📱 | Web 端（浏览器） |
| 🖥️ | Windows 端（桌面） |
| ✅ | 功能完成/验证通过 |
| ⚠️ | 警告/不支持 |
| ❌ | 错误/失败 |
| 🚀 | 快速开始 |
| 💡 | 提示信息 |
| 🔧 | 配置/工具 |

## 💻 代码片段

### 快速测试

```typescript
// 测试 Web 端 AI
const webMessage = {
  meta: { clientType: 'web', ... },
  payload: { action: 'ai', params: '点击按钮' }
};

// 测试 Windows 端 AI
const winMessage = {
  meta: { clientType: 'windows', ... },
  payload: { action: 'ai', params: '打开记事本' }
};

// 测试验证（Windows 不支持 connectTab）
const invalidMessage = {
  meta: { clientType: 'windows', ... },
  payload: { action: 'connectTab', ... }  // ❌ 会被拒绝
};
```

### 编程式使用

```typescript
import { useClientTypeActions } from '@/hooks/useClientTypeActions';

const { getActionsForClientType, isActionSupported } = useClientTypeActions();

// 获取可用 actions
const webActions = getActionsForClientType('web');      // 6 个
const winActions = getActionsForClientType('windows');  // 3 个

// 检查支持
isActionSupported('web', 'connectTab');      // true
isActionSupported('windows', 'connectTab');  // false
```

## 🔥 重点提示

1. **配置是唯一数据源** - 所有修改都在 `clientTypeActions.ts`
2. **Web 端自动同步** - 重启服务器后刷新页面即可
3. **双端都会验证** - UI 限制 + 服务端拦截
4. **默认是 Web 端** - 不传 clientType 自动为 'web'

---

**版本：** 1.0.0  
**最后更新：** 2025-10-13  
**状态：** ✅ 生产就绪

🎉 **现在就开始使用吧！**
