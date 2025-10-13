# FlowAction 配置化 - 快速参考

## 📚 已完成的后端部分

### ✅ 文件清单

1. **配置文件**
   - `apps/server/src/config/clientTypeFlowActions.ts` ✅

2. **API 路由**
   - `apps/server/src/routes/clientTypeFlowActions.ts` ✅
   - `apps/server/src/routes/index.ts` (已更新) ✅

3. **文档**
   - `apps/server/docs/FlowAction配置化架构设计.md` ✅
   - `docs/FlowAction配置化快速参考.md` ✅ (本文件)

## 🔌 API 端点

```
GET /api/client-type-flow-actions
GET /api/client-type-flow-actions/types
GET /api/client-type-flow-actions/:clientType
GET /api/client-type-flow-actions/:clientType/configs
GET /api/client-type-flow-actions/:clientType/by-category
GET /api/client-type-flow-actions/:clientType/check/:actionType
```

## 📊 支持的操作对比

| 客户端 | 基础操作 | 查询 | 高级 | 工具 | 特有操作 | 总计 |
|--------|---------|------|------|------|---------|------|
| **web** | 9 | 4 | 2 | 3 | 0 | **18** |
| **windows** | 9 | 4 | 2 | 3 | 4 | **22** |

### Windows 特有操作

- `getClipboard` - 获取剪贴板
- `setClipboard` - 设置剪贴板
- `getWindowList` - 获取窗口列表
- `activateWindow` - 激活窗口

## 🚧 待实现（前端）

1. **创建 Hook**
   ```bash
   apps/web/src/hooks/useClientTypeFlowActions.ts
   ```

2. **修改组件**
   ```bash
   apps/web/src/components/debug/FlowActionItem.tsx
   ```

3. **更新类型**
   ```bash
   apps/web/src/types/debug.ts
   ```

## 💡 使用示例

### 后端 API 调用

```bash
# 获取所有配置
curl http://localhost:3000/api/client-type-flow-actions

# 获取 Windows 支持的操作
curl http://localhost:3000/api/client-type-flow-actions/windows

# 按类别获取
curl http://localhost:3000/api/client-type-flow-actions/windows/by-category
```

### 前端 Hook 使用（待实现）

```tsx
import { useClientTypeFlowActions } from '@/hooks/useClientTypeFlowActions';

function MyComponent() {
  const { 
    loading, 
    error, 
    getFlowActionsForClientType 
  } = useClientTypeFlowActions();

  const windowsActions = getFlowActionsForClientType('windows');
  
  return (
    <Select>
      {windowsActions.map(action => (
        <option key={action.type} value={action.type}>
          {action.label}
        </option>
      ))}
    </Select>
  );
}
```

## 📋 下一步

1. [ ] 实现前端 Hook
2. [ ] 修改 FlowActionItem 组件
3. [ ] 测试 API 端点
4. [ ] 添加类别分组 UI
5. [ ] 完善文档

---

**参考完整文档**: `apps/server/docs/FlowAction配置化架构设计.md`

