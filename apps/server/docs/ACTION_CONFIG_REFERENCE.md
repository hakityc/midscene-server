# Action 配置快速参考

## 配置文件位置

`src/config/clientTypeActions.ts`

## 当前配置

### Web 端支持的 Actions

| Action | 名称 | 描述 | 类别 |
|--------|------|------|------|
| `CONNECT_TAB` | 连接标签页 | 连接浏览器标签页 | 系统 |
| `AI` | AI 执行 | 执行 AI 自然语言指令 | 基础 |
| `AI_SCRIPT` | AI 脚本 | 执行 AI YAML 脚本 | 高级 |
| `DOWNLOAD_VIDEO` | 下载视频 | 下载视频资源 | 高级 |
| `SITE_SCRIPT` | 站点脚本 | 在网页中执行 JavaScript | 高级 |
| `COMMAND` | 服务命令 | 控制服务生命周期 | 系统 |

**总计：6 个操作**

### Windows 端支持的 Actions

| Action | 名称 | 描述 | 类别 |
|--------|------|------|------|
| `AI` | AI 执行 | 执行 Windows 桌面 AI 指令 | 基础 |
| `AI_SCRIPT` | AI 脚本 | 执行 Windows AI YAML 脚本 | 高级 |
| `COMMAND` | 服务命令 | 控制 Windows 服务 | 系统 |

**总计：3 个操作**

## 快速添加新 Action

### 1. 编辑配置文件

```typescript
// src/config/clientTypeActions.ts

export const CLIENT_TYPE_ACTIONS = {
  web: [
    // ... 现有配置
    {
      action: WebSocketAction.YOUR_NEW_ACTION,  // ← 添加这里
      name: '你的新功能',
      description: '详细描述',
      category: 'advanced',  // basic | advanced | system
    },
  ],
};
```

### 2. 重启服务器

```bash
# 在 apps/server 目录
pnpm dev
```

### 3. 刷新 Web 页面

ActionSelector 会自动显示新 action！

## API 快速测试

```bash
# 获取完整配置
curl http://localhost:3000/api/client-type-actions

# 获取 Web 端配置
curl http://localhost:3000/api/client-type-actions/web

# 获取 Windows 端配置
curl http://localhost:3000/api/client-type-actions/windows

# 获取客户端类型列表
curl http://localhost:3000/api/client-type-actions/types
```

## 工具函数速查

### 服务端

```typescript
import {
  getSupportedActions,      // 获取 action 列表
  getActionConfigs,         // 获取完整配置
  isActionSupported,        // 检查是否支持
  validateMessageAction,    // 验证消息
} from '../config/clientTypeActions';

// 示例
const actions = getSupportedActions('web');
const supported = isActionSupported('windows', 'connectTab');
const result = validateMessageAction('web', 'ai');
```

### Web 端

```typescript
import { useClientTypeActions } from '@/hooks/useClientTypeActions';

const {
  getActionsForClientType,
  isActionSupported,
  getActionsByCategory,
} = useClientTypeActions();

// 示例
const webActions = getActionsForClientType('web');
const { basic, advanced, system } = getActionsByCategory('windows');
```

## 分类说明

| 类别 | 用途 | 示例 |
|------|------|------|
| `basic` | 基础功能，常用操作 | AI 执行 |
| `advanced` | 高级功能，复杂操作 | AI 脚本、视频下载 |
| `system` | 系统功能，服务控制 | 连接标签页、服务命令 |

## 常见问题

**Q: 如何让 Web 和 Windows 都支持同一个 action？**

A: 在两个配置中都添加：

```typescript
const aiActionConfig = {
  action: WebSocketAction.AI,
  name: 'AI 执行',
  category: 'basic',
};

export const CLIENT_TYPE_ACTIONS = {
  web: [
    { ...aiActionConfig, description: 'Web AI 指令' },
    // ...
  ],
  windows: [
    { ...aiActionConfig, description: 'Windows AI 指令' },
    // ...
  ],
};
```

**Q: 如何禁用某个 action？**

A: 从配置中移除该 action，然后重启服务器。

**Q: Web 端多久同步一次配置？**

A: 页面加载时同步一次。如需重新同步，刷新页面即可。

**Q: 可以添加自定义分类吗？**

A: 可以，修改 `category` 类型定义并更新相关代码。

## 相关文档

- [CLIENT_TYPE_ACTION_VALIDATION.md](./CLIENT_TYPE_ACTION_VALIDATION.md) - 详细技术文档
- [CLIENT_TYPE_FEATURE.md](./CLIENT_TYPE_FEATURE.md) - 客户端类型功能
- [ACTIONS_ARCHITECTURE.md](./ACTIONS_ARCHITECTURE.md) - Actions 架构

---

**最后更新：** 2025-10-13
