# FlowAction 配置化架构设计

## 📝 背景

之前 FlowActionItem 的动作类型选项是硬编码在前端代码中的：

```typescript
// ❌ 硬编码方式（原有实现）
const actionTypeOptions = [
  { value: 'aiTap', label: 'AI 点击 (aiTap)' },
  { value: 'aiInput', label: 'AI 输入 (aiInput)' },
  // ...
];
```

**问题**：

- 不同客户端（web、windows）支持的操作不一样
- 前后端配置不同步
- 扩展新操作需要修改多处代码
- 无法动态获取操作元数据（参数、示例等）

## 🎯 解决方案

参考 `clientTypeActions` 的设计，为 FlowAction 实现统一的配置化架构。

### 架构设计

```
┌─────────────────────────────────────────────────┐
│         后端配置（唯一数据源）                      │
├─────────────────────────────────────────────────┤
│ clientTypeFlowActions.ts                         │
│ - 定义所有 FlowAction 类型                        │
│ - 为每个 client 配置支持的 actions                 │
│ - 包含详细的元数据（label, description, params等） │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              后端 API 接口                        │
├─────────────────────────────────────────────────┤
│ GET /api/client-type-flow-actions                │
│ GET /api/client-type-flow-actions/:clientType    │
│ GET /api/client-type-flow-actions/:type/configs  │
│ GET /api/client-type-flow-actions/:type/by-category │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│            前端 Hook（待实现）                     │
├─────────────────────────────────────────────────┤
│ useClientTypeFlowActions()                       │
│ - 从后端获取配置                                  │
│ - 提供便捷的查询方法                              │
│ - 按类别分组                                     │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│          前端组件（待修改）                        │
├─────────────────────────────────────────────────┤
│ FlowActionItem.tsx                               │
│ - 使用 hook 获取动态配置                          │
│ - 根据 clientType 显示对应的 actions              │
│ - 自动生成参数表单                                │
└─────────────────────────────────────────────────┘
```

## 📦 已实现的后端部分

### 1. 配置文件 (`clientTypeFlowActions.ts`)

**定义的类型**：

```typescript
export type FlowActionType =
  // 基础操作
  | 'aiTap' | 'aiInput' | 'aiAssert' | 'aiHover' | 'aiScroll'
  | 'aiWaitFor' | 'aiKeyboardPress' | 'aiDoubleClick' | 'aiRightClick'
  // 查询操作
  | 'aiQuery' | 'aiString' | 'aiNumber' | 'aiBoolean'
  // 高级操作
  | 'aiAction' | 'aiLocate'
  // 工具方法
  | 'sleep' | 'screenshot' | 'logText'
  // Windows 特有
  | 'getClipboard' | 'setClipboard' | 'getWindowList' | 'activateWindow'
  | 'pressHotkey' | 'launchApp' | 'closeApp'; // 未来扩展
```

**配置结构**：

```typescript
interface FlowActionConfig {
  type: FlowActionType;
  label: string;
  description: string;
  category: 'basic' | 'query' | 'advanced' | 'utility' | 'windows-specific';
  params: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    placeholder?: string;
    description?: string;
  }>;
  example?: string;
}
```

**支持的客户端**：

- **web**: 所有基础操作 + 查询 + 高级 + 工具（28个操作）
- **windows**: web 的所有 + Windows 特有操作（32个操作）

### 2. API 路由 (`clientTypeFlowActions.ts`)

| 端点 | 说明 |
|------|------|
| `GET /api/client-type-flow-actions` | 获取完整配置 |
| `GET /api/client-type-flow-actions/types` | 获取所有客户端类型 |
| `GET /api/client-type-flow-actions/:clientType` | 获取指定客户端的 flow actions |
| `GET /api/client-type-flow-actions/:clientType/configs` | 获取详细配置 |
| `GET /api/client-type-flow-actions/:clientType/by-category` | 按类别分组获取 |
| `GET /api/client-type-flow-actions/:clientType/check/:actionType` | 检查是否支持 |

### 3. 主路由注册

已在 `routes/index.ts` 中注册：

```typescript
app.route('/api/client-type-flow-actions', clientTypeFlowActionsRouter);
```

## 📝 待实现的前端部分

### 1. 创建前端 Hook

文件：`apps/web/src/hooks/useClientTypeFlowActions.ts`

```typescript
import { useEffect, useState } from 'react';
import type { ClientType } from '@/types/debug';

export interface FlowActionConfig {
  type: string;
  label: string;
  description: string;
  category: 'basic' | 'query' | 'advanced' | 'utility' | 'windows-specific';
  params: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    placeholder?: string;
    description?: string;
  }>;
  example?: string;
}

export interface ClientTypeFlowActionsConfig {
  clientTypes: ClientType[];
  flowActions: Record<ClientType, FlowActionConfig[]>;
}

export function useClientTypeFlowActions(apiUrl: string = 'http://localhost:3000') {
  const [config, setConfig] = useState<ClientTypeFlowActionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/client-type-flow-actions`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setConfig(result.data);
          setError(null);
        } else {
          throw new Error(result.error || '获取配置失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [apiUrl]);

  /**
   * 获取指定客户端类型支持的 Flow Actions
   */
  const getFlowActionsForClientType = (clientType: ClientType): FlowActionConfig[] => {
    if (!config) return [];
    return config.flowActions[clientType] || [];
  };

  /**
   * 按类别分组 flow actions
   */
  const getFlowActionsByCategory = (clientType: ClientType) => {
    const actions = getFlowActionsForClientType(clientType);
    return {
      basic: actions.filter((a) => a.category === 'basic'),
      query: actions.filter((a) => a.category === 'query'),
      advanced: actions.filter((a) => a.category === 'advanced'),
      utility: actions.filter((a) => a.category === 'utility'),
      'windows-specific': actions.filter((a) => a.category === 'windows-specific'),
    };
  };

  /**
   * 获取指定 Flow Action 的配置
   */
  const getFlowActionConfig = (
    clientType: ClientType,
    actionType: string
  ): FlowActionConfig | undefined => {
    return getFlowActionsForClientType(clientType).find(
      (cfg) => cfg.type === actionType
    );
  };

  /**
   * 检查某个 action 是否被客户端类型支持
   */
  const isFlowActionSupported = (clientType: ClientType, actionType: string): boolean => {
    return getFlowActionsForClientType(clientType).some(
      (cfg) => cfg.type === actionType
    );
  };

  return {
    config,
    loading,
    error,
    getFlowActionsForClientType,
    getFlowActionsByCategory,
    getFlowActionConfig,
    isFlowActionSupported,
  };
}
```

### 2. 修改 FlowActionItem 组件

文件：`apps/web/src/components/debug/FlowActionItem.tsx`

**主要修改**：

```typescript
import { useClientTypeFlowActions } from '@/hooks/useClientTypeFlowActions';

interface FlowActionItemProps {
  // ... 现有 props
  clientType: ClientType; // 需要添加这个 prop
}

export function FlowActionItem({ 
  task, 
  onChange, 
  clientType // 新增
}: FlowActionItemProps) {
  const {
    loading,
    error,
    getFlowActionsForClientType,
    getFlowActionsByCategory,
    getFlowActionConfig,
  } = useClientTypeFlowActions();

  // ❌ 删除硬编码的 actionTypeOptions
  // const actionTypeOptions = [...]
  
  // ✅ 使用动态配置
  const actionTypeOptions = getFlowActionsForClientType(clientType).map(cfg => ({
    value: cfg.type,
    label: cfg.label,
  }));
  
  // 按类别分组显示（可选）
  const actionsByCategory = getFlowActionsByCategory(clientType);
  
  // 获取当前选中 action 的配置
  const currentActionConfig = getFlowActionConfig(clientType, task.type);
  
  // 根据配置自动生成参数表单
  const renderParamsForm = () => {
    if (!currentActionConfig) return null;
    
    return currentActionConfig.params.map(param => (
      <FormField key={param.name}>
        <Label>{param.label}</Label>
        <Input
          type={param.type === 'number' ? 'number' : 'text'}
          placeholder={param.placeholder}
          required={param.required}
          // ...
        />
      </FormField>
    ));
  };
  
  // ... 其他代码
}
```

### 3. 更新父组件传递 clientType

需要确保 `FlowActionItem` 的父组件传递 `clientType` prop。

## 🎨 类别分组显示（建议）

可以在 UI 中按类别分组显示操作：

```tsx
// 基础操作
├─ AI 点击 (aiTap)
├─ AI 输入 (aiInput)
├─ AI 断言 (aiAssert)
└─ ...

// 查询操作
├─ AI 查询 (aiQuery)
├─ AI 查询字符串 (aiString)
└─ ...

// Windows 特有
├─ 获取剪贴板 (getClipboard)
├─ 设置剪贴板 (setClipboard)
└─ ...
```

## 📊 Web 与 Windows 支持对比

| 操作类别 | Web | Windows | 备注 |
|---------|-----|---------|------|
| 基础操作（9种） | ✅ | ✅ | 完全相同 |
| 查询操作（4种） | ✅ | ✅ | 完全相同 |
| 高级操作（2种） | ✅ | ✅ | 完全相同 |
| 工具方法（3种） | ✅ | ✅ | 完全相同 |
| Windows 特有 | ❌ | ✅ 4种 | getClipboard, setClipboard, getWindowList, activateWindow |
| **总计** | **18种** | **22种** | Windows 比 Web 多 4 种特有操作 |

## 🚀 扩展新操作的步骤

以后要添加新的 FlowAction 操作，只需要：

1. **在后端配置中添加定义**：

   ```typescript
   // apps/server/src/config/clientTypeFlowActions.ts
   export type FlowActionType = 
     | 'existing actions...'
     | 'newAction'; // 添加新类型
   
   CLIENT_TYPE_FLOW_ACTIONS.windows.push({
     type: 'newAction',
     label: '新操作',
     description: '新操作的描述',
     category: 'windows-specific',
     params: [...],
     example: '...',
   });
   ```

2. **前端自动支持**：
   - 无需修改前端代码
   - 自动出现在操作列表中
   - 自动生成参数表单

## 💡 优势

### 1. 统一配置源

- 后端是唯一数据源
- 前后端自动同步
- 减少维护成本

### 2. 动态扩展

- 添加新操作无需修改前端
- 支持不同客户端的差异化配置
- 易于测试和调试

### 3. 丰富的元数据

- 操作说明
- 参数定义
- 使用示例
- 类别分组

### 4. 类型安全

- TypeScript 类型定义
- 运行时验证
- API 响应类型

## 📝 TODO

- [ ] 创建前端 Hook `useClientTypeFlowActions`
- [ ] 修改 `FlowActionItem` 组件使用动态配置
- [ ] 更新父组件传递 `clientType`
- [ ] 添加类别分组 UI
- [ ] 根据参数配置自动生成表单
- [ ] 添加操作说明和示例展示
- [ ] 编写单元测试
- [ ] 更新文档

## 🔗 相关文件

### 后端

- `apps/server/src/config/clientTypeFlowActions.ts` - 配置定义 ✅
- `apps/server/src/routes/clientTypeFlowActions.ts` - API 路由 ✅
- `apps/server/src/routes/index.ts` - 路由注册 ✅

### 前端（待实现）

- `apps/web/src/hooks/useClientTypeFlowActions.ts` - Hook（待创建）
- `apps/web/src/components/debug/FlowActionItem.tsx` - 组件（待修改）
- `apps/web/src/types/debug.ts` - 类型定义（可能需要更新）

---

**总结**：这个架构改进让 FlowAction 的配置完全由后端控制，前端动态获取，实现了真正的配置化和客户端差异化支持。
