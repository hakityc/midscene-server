# Action 验证系统 - 完整指南

## 系统概览

一个完整的 Action 验证系统，确保不同客户端类型只能使用其支持的操作。

**核心理念：** 服务端单一配置源 + Web 端自动同步 + 双端验证

## 架构图

```
┌───────────────────────────────────────────────────────────────┐
│                    配置层（单一数据源）                        │
│              src/config/clientTypeActions.ts                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ CLIENT_TYPE_ACTIONS = {                             │    │
│  │   web: [connectTab, ai, aiScript, ...],             │    │
│  │   windows: [ai, aiScript, command]                  │    │
│  │ }                                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────┬───────────────────────────────────┬─────────────────────┘
      │                                   │
      │ API                              │ Import
      │                                   │
┌─────▼──────────────┐          ┌────────▼─────────────────┐
│   API 路由层       │          │   WebSocket 验证层       │
│ routes/            │          │ websocket/               │
│ clientTypeActions  │          │ index.ts                 │
│                    │          │                          │
│ GET /api/...       │          │ validateMessageAction()  │
│  ↓ 返回配置         │          │  ↓ 验证消息              │
└─────┬──────────────┘          └────────┬─────────────────┘
      │                                   │
      │ HTTP                             │ 验证结果
      │                                   │
┌─────▼──────────────┐          ┌────────▼─────────────────┐
│   Web 端           │          │   消息处理               │
│                    │          │                          │
│ useClientTypeActions│          │ 通过 → 执行 handler     │
│  ↓ 获取配置         │          │ 失败 → 返回错误          │
│                    │          │                          │
│ ActionSelector     │          └──────────────────────────┘
│  ↓ 动态显示         │
│                    │
│ 用户选择 action     │───发送消息───┐
└────────────────────┘              │
                                    │
                              ┌─────▼──────┐
                              │ WebSocket  │
                              │   验证     │
                              └────────────┘
```

## 数据流

### 1. 配置同步流程

```
启动服务器
    ↓
加载配置文件 (clientTypeActions.ts)
    ↓
注册 API 路由 (/api/client-type-actions)
    ↓
Web 端访问
    ↓
useClientTypeActions 调用 API
    ↓
获取配置并缓存
    ↓
ActionSelector 渲染可用 actions
    ↓
用户看到分类的操作列表
```

### 2. 消息验证流程

```
用户发送消息
    ↓
WebSocket 接收消息
    ↓
提取 clientType (默认 'web')
    ↓
提取 action
    ↓
调用 validateMessageAction(clientType, action)
    ↓
    ├─ 验证通过 → 执行 handler → 返回结果
    │
    └─ 验证失败 → 返回错误消息
                  "Action 'xxx' 不支持 yyy 端"
```

### 3. 客户端类型切换流程

```
用户在 MetaForm 选择新的 clientType
    ↓
meta.clientType 更新
    ↓
ActionSelector 收到新的 clientType prop
    ↓
useMemo 重新计算可用 actions
    ↓
检查当前选中的 action 是否支持
    ├─ 支持 → 正常显示
    │
    └─ 不支持 → 显示警告
                用户需要选择其他 action
```

## 核心组件

### 1. 配置管理（服务端）

**文件：** `src/config/clientTypeActions.ts`

**提供的功能：**
```typescript
// 获取支持的 actions
getSupportedActions(clientType: ClientType): WebSocketAction[]

// 获取完整配置
getActionConfigs(clientType: ClientType): ActionConfig[]

// 检查是否支持
isActionSupported(clientType: ClientType, action: WebSocketAction): boolean

// 验证消息
validateMessageAction(clientType: ClientType, action: WebSocketAction): 
  { valid: boolean; error?: string }

// 获取所有类型
getAllClientTypes(): ClientType[]

// 获取完整配置（API 用）
getFullActionConfig(): { clientTypes, actions }
```

### 2. API 路由（服务端）

**文件：** `src/routes/clientTypeActions.ts`

**提供的接口：**
- `GET /api/client-type-actions` - 完整配置
- `GET /api/client-type-actions/types` - 客户端类型列表
- `GET /api/client-type-actions/:clientType` - 指定类型的 actions
- `GET /api/client-type-actions/:clientType/configs` - 详细配置

### 3. WebSocket 验证（服务端）

**文件：** `src/websocket/index.ts`

**验证逻辑：**
```typescript
const clientType = message.meta?.clientType || 'web';
const validation = validateMessageAction(clientType, action);

if (!validation.valid) {
  // 记录警告日志
  wsLogger.warn({ clientType, action, error: validation.error });
  
  // 返回错误消息
  sendMessage(ws, createErrorResponse(message, validation.error));
  return;
}

// 验证通过，继续处理
```

### 4. Hook（Web 端）

**文件：** `src/hooks/useClientTypeActions.ts`

**功能：**
- 自动从 API 获取配置
- 缓存配置数据
- 提供查询和验证方法
- 处理加载和错误状态

### 5. 智能组件（Web 端）

**文件：** `src/components/debug/ActionSelector.tsx`

**功能：**
- 根据 clientType 动态显示 actions
- 按类别分组展示
- 实时验证和警告
- 显示操作描述和统计

## 配置示例

### 添加仅 Web 支持的 Action

```typescript
export const CLIENT_TYPE_ACTIONS = {
  web: [
    {
      action: WebSocketAction.SCREENSHOT,  // 新 action
      name: '网页截图',
      description: '截取当前网页的屏幕截图',
      category: 'advanced',
    },
    // ... 其他 actions
  ],
  windows: [
    // 不添加，Windows 端不支持
  ],
};
```

### 添加两端都支持的 Action

```typescript
const aiConfig = {
  action: WebSocketAction.AI,
  name: 'AI 执行',
  category: 'basic' as const,
};

export const CLIENT_TYPE_ACTIONS = {
  web: [
    {
      ...aiConfig,
      description: '执行 AI 自然语言指令（浏览器）',
    },
    // ...
  ],
  windows: [
    {
      ...aiConfig,
      description: '执行 Windows 桌面 AI 指令',
    },
    // ...
  ],
};
```

### 添加仅 Windows 支持的 Action

```typescript
export const CLIENT_TYPE_ACTIONS = {
  web: [
    // 不添加
  ],
  windows: [
    {
      action: WebSocketAction.DESKTOP_SCREENSHOT,  // 新 action
      name: '桌面截图',
      description: '截取 Windows 桌面屏幕',
      category: 'advanced',
    },
    // ... 其他 actions
  ],
};
```

## 验证规则

### 规则 1: Action 必须在配置中

```typescript
// ✅ 正确
clientType: 'web', action: 'ai'         // web 配置中有 ai
clientType: 'windows', action: 'ai'     // windows 配置中有 ai

// ❌ 错误
clientType: 'windows', action: 'connectTab'  // windows 配置中没有
// → 返回错误："Action 'connectTab' 不支持 windows 端"
```

### 规则 2: ClientType 必须有效

```typescript
// ✅ 正确
clientType: 'web'      // 已定义
clientType: 'windows'  // 已定义
clientType: undefined  // 默认为 'web'

// ❌ 错误（如果配置中没有）
clientType: 'mobile'   // 未定义
// → 返回错误："无效的客户端类型"
```

### 规则 3: Action 枚举必须存在

```typescript
// ✅ 正确
action: 'ai'        // WebSocketAction.AI
action: 'command'   // WebSocketAction.COMMAND

// ❌ 错误
action: 'unknown'   // 不在 WebSocketAction 枚举中
// → 返回错误："未知的 action"
```

## 监控和日志

### 成功日志

```
info: Action 验证通过
{
  connectionId: 'conn_xxx',
  clientType: 'web',
  action: 'ai',
  messageId: 'msg_xxx'
}
```

### 失败日志

```
warn: Action 验证失败
{
  connectionId: 'conn_xxx',
  clientType: 'windows',
  action: 'connectTab',
  error: "Action 'connectTab' 不支持 windows 端。支持的 actions: ai, aiScript, command"
}
```

### API 访问日志

```
info: GET /api/client-type-actions - 200 OK
info: GET /api/client-type-actions/web - 200 OK
error: GET /api/client-type-actions/invalid - 400 Bad Request
```

## 安全性

### 1. 服务端验证

所有消息都经过验证，防止非法 action：

```typescript
// 即使客户端绕过 UI 限制，服务端也会拦截
if (!isActionSupported(clientType, action)) {
  return error;
}
```

### 2. 类型检查

TypeScript 编译时检查，避免错误：

```typescript
// ✅ 编译通过
const action: WebSocketAction = 'ai';

// ❌ 编译错误
const action: WebSocketAction = 'invalid';
```

### 3. 错误处理

详细的错误信息，便于调试：

```
错误信息包含：
- 当前 clientType
- 尝试的 action
- 支持的 actions 列表
```

## 测试建议

### 单元测试

```typescript
describe('clientTypeActions', () => {
  it('should return correct actions for web', () => {
    const actions = getSupportedActions('web');
    expect(actions).toContain('connectTab');
    expect(actions).toContain('ai');
  });

  it('should validate action correctly', () => {
    const result1 = validateMessageAction('web', 'connectTab');
    expect(result1.valid).toBe(true);

    const result2 = validateMessageAction('windows', 'connectTab');
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain('不支持');
  });
});
```

### 集成测试

```typescript
describe('API /api/client-type-actions', () => {
  it('should return full config', async () => {
    const res = await fetch('http://localhost:3000/api/client-type-actions');
    const data = await res.json();
    
    expect(data.success).toBe(true);
    expect(data.data.clientTypes).toContain('web');
    expect(data.data.clientTypes).toContain('windows');
  });
});
```

### E2E 测试

```typescript
describe('ActionSelector', () => {
  it('should show different actions for different client types', async () => {
    // 选择 Web 端
    await selectClientType('web');
    expect(getActionOptions()).toHaveLength(6);
    expect(getActionOptions()).toContain('连接标签页');

    // 切换到 Windows 端
    await selectClientType('windows');
    expect(getActionOptions()).toHaveLength(3);
    expect(getActionOptions()).not.toContain('连接标签页');
  });
});
```

## 相关文档索引

### 服务端

- [CLIENT_TYPE_ACTION_VALIDATION.md](../apps/server/docs/CLIENT_TYPE_ACTION_VALIDATION.md) - 验证系统详细文档
- [ACTION_CONFIG_REFERENCE.md](../apps/server/docs/ACTION_CONFIG_REFERENCE.md) - 配置快速参考
- [CLIENT_TYPE_FEATURE.md](../apps/server/docs/CLIENT_TYPE_FEATURE.md) - 客户端类型功能
- [WINDOWS_SERVICE_INTEGRATION.md](../apps/server/docs/WINDOWS_SERVICE_INTEGRATION.md) - Windows Service 接入

### Web 端

- [ACTION_SELECTOR_GUIDE.md](../apps/web/docs/ACTION_SELECTOR_GUIDE.md) - ActionSelector 使用指南
- [CLIENT_TYPE_USAGE.md](../apps/web/docs/CLIENT_TYPE_USAGE.md) - 客户端类型使用
- [CLIENT_TYPE_QUICK_START.md](../apps/web/docs/CLIENT_TYPE_QUICK_START.md) - 快速开始

## 维护清单

### 添加新 Action

- [ ] 在 `WebSocketAction` 枚举中添加
- [ ] 在 `CLIENT_TYPE_ACTIONS` 配置中添加
- [ ] 实现对应的 handler
- [ ] 注册 handler
- [ ] 重启服务器
- [ ] 测试验证

### 修改现有 Action

- [ ] 更新配置中的 `name` 或 `description`
- [ ] 如需改变支持平台，添加/删除配置项
- [ ] 重启服务器
- [ ] 刷新 Web 页面验证

### 移除 Action

- [ ] 从配置中删除
- [ ] 注释或删除 handler 代码
- [ ] 更新相关文档
- [ ] 重启服务器
- [ ] 测试确认

## 总结

Action 验证系统提供了：

✅ **统一管理** - 服务端单一配置源  
✅ **自动同步** - Web 端自动获取最新配置  
✅ **严格验证** - 双端验证，防止非法操作  
✅ **用户友好** - 智能 UI，实时提示  
✅ **类型安全** - TypeScript 全程保障  
✅ **易于维护** - 清晰的架构和文档  

让多平台开发更安全、更高效！

---

**维护者：** 开发团队  
**最后更新：** 2025-10-13  
**状态：** ✅ 生产就绪

