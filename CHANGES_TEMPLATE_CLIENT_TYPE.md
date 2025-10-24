# 模板客户端类型功能 - 变更清单

## 📦 本次变更概述

为 Midscene Debug Tool 添加了完整的模板端类型支持，实现了 Web 端和 Windows 端模板的区分、筛选、编辑和自动切换功能。

## 🆕 新增文件

### 核心组件
1. **apps/web/src/components/ui/dropdown-menu.tsx**
   - 基于 Radix UI 的下拉菜单组件
   - 用于编辑模板的端类型

### 文档
2. **apps/web/README_TEMPLATE_CLIENT_TYPE.md**
   - 功能使用说明文档
   - 包含 UI 操作和控制台操作指南

3. **apps/web/docs/模板客户端类型快速参考.md**
   - 快速参考指南
   - 包含常见操作示例

4. **apps/web/docs/模板端类型功能演示.md**
   - 功能演示说明
   - 包含视觉指南和交互流程

5. **IMPLEMENTATION_SUMMARY_TEMPLATE_CLIENT_TYPE.md**
   - 实现总结文档
   - 技术细节和设计思路

## 📝 修改文件

### 类型定义
1. **apps/web/src/types/debug.ts**
   ```typescript
   // 为 Template 接口添加 clientType 字段
   export interface Template {
     id: string;
     name: string;
     description: string;
     action: WebSocketAction;
     message: WsInboundMessage;
     clientType?: ClientType; // 新增字段
   }
   ```

### 核心逻辑
2. **apps/web/src/utils/templateStorage.ts**
   - 扩展 `createTemplateFromTasks` 函数，支持 `clientType` 参数
   - 新增 `updateTemplatesClientType` 函数，支持批量更新

3. **apps/web/src/pages/midsceneDebugPage.tsx**
   - 修改 `handleLoadTemplate` 函数
   - 加载模板时自动切换到对应的端类型

### UI 组件
4. **apps/web/src/components/debug/TemplatePanel.tsx**
   - 添加端类型筛选按钮（全部/Web/Windows）
   - 为每个模板添加端类型标签
   - 添加编辑按钮和下拉菜单
   - 实现端类型修改功能

5. **apps/web/src/components/debug/TaskItem.tsx**
   - 保存模板时传入 `clientType` 参数

### 依赖配置
6. **apps/web/package.json**
   ```json
   {
     "dependencies": {
       "@radix-ui/react-dropdown-menu": "2.1.16"  // 新增依赖
     }
   }
   ```

7. **pnpm-lock.yaml**
   - 锁定新增依赖的版本

## 🔧 技术实现细节

### 1. 数据结构扩展
```typescript
// Template 接口添加可选字段
clientType?: ClientType; // 'web' | 'windows'

// 创建模板时记录
const template = {
  ...otherFields,
  clientType: 'windows', // 从表单获取
  message: {
    meta: {
      clientType: 'windows', // 同步到消息元数据
    }
  }
};
```

### 2. 筛选逻辑
```typescript
// 旧模板兼容：没有 clientType 的默认为 'web'
const filteredTemplates = templates.filter((template) => {
  if (selectedClientType === 'all') return true;
  const templateClientType = template.clientType || 'web';
  return templateClientType === selectedClientType;
});
```

### 3. 自动切换逻辑
```typescript
// 加载模板时的优先级
const clientType = 
  template.clientType ||           // 优先使用模板的 clientType
  msg.meta.clientType ||           // 其次使用消息元数据的 clientType
  'web';                           // 默认为 web

setMeta({ ...msg.meta, clientType });
```

### 4. UI 组件设计
```tsx
// 端类型标签
{template.clientType === 'windows' ? (
  <span className="bg-blue-100 text-blue-700">
    <Window className="h-3 w-3" />
    Windows
  </span>
) : (
  <span className="bg-green-100 text-green-700">
    <Monitor className="h-3 w-3" />
    Web
  </span>
)}

// 编辑下拉菜单
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button><Pencil /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleUpdate('web')} disabled={isWeb}>
      设为 Web 端
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleUpdate('windows')} disabled={isWindows}>
      设为 Windows 端
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## 🎨 视觉设计

### 颜色方案
- **Web 端标签**：绿色系 (`bg-green-100 text-green-700`)
- **Windows 端标签**：蓝色系 (`bg-blue-100 text-blue-700`)

### 图标使用
- **Web 端**：`<Monitor />` (lucide-react)
- **Windows 端**：`<Window />` (lucide-react)
- **编辑**：`<Pencil />` (lucide-react)

### 布局设计
```
┌─────────────────────────────┐
│ 快速模板        2 / 5 个模板 │
├─────────────────────────────┤
│ [全部] [Web] [Windows]       │  ← 筛选区
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 模板名 [🔵 Windows]      │ │  ← 标签
│ │ 描述                     │ │
│ │ [使用] [编辑] [删除]     │ │  ← 操作
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## 📊 代码统计

### 新增代码
- 新增文件：5 个
- 新增 UI 组件：1 个 (dropdown-menu.tsx, ~200 行)
- 新增工具函数：1 个 (updateTemplatesClientType)
- 新增文档：4 个 (约 500 行)

### 修改代码
- 修改文件：5 个
- 修改类型定义：1 处
- 修改核心逻辑：3 处
- 修改 UI 组件：2 处

### 依赖变更
- 新增依赖：1 个 (@radix-ui/react-dropdown-menu)

## ✅ 功能检查清单

- [x] 模板数据结构支持 clientType 字段
- [x] 创建模板时自动记录端类型
- [x] 模板列表显示端类型标签
- [x] 支持按端类型筛选模板
- [x] 支持通过 UI 编辑端类型
- [x] 支持批量更新端类型（控制台）
- [x] 加载模板时自动切换端类型
- [x] 旧模板向后兼容（默认 web）
- [x] 数据一致性（模板和消息元数据同步）
- [x] 完整的文档和使用指南

## 🧪 测试建议

### 功能测试
1. 在 Web 端创建模板 → 验证标签为绿色 Web
2. 在 Windows 端创建模板 → 验证标签为蓝色 Windows
3. 使用筛选按钮 → 验证筛选逻辑正确
4. 使用编辑按钮修改类型 → 验证更新成功
5. 加载不同端类型模板 → 验证自动切换

### 兼容性测试
1. 加载旧模板 → 验证默认显示为 Web 端
2. 修改旧模板类型 → 验证字段正确添加

### 边界测试
1. 空模板列表 → 验证提示信息正确
2. 全部筛选为某一端 → 验证空状态提示
3. 快速连续点击 → 验证状态更新正确

## 📚 相关文档

1. **使用说明**：`apps/web/README_TEMPLATE_CLIENT_TYPE.md`
2. **快速参考**：`apps/web/docs/模板客户端类型快速参考.md`
3. **功能演示**：`apps/web/docs/模板端类型功能演示.md`
4. **实现总结**：`IMPLEMENTATION_SUMMARY_TEMPLATE_CLIENT_TYPE.md`

## 🚀 后续优化建议

1. **UI 增强**
   - 添加模板统计卡片（显示各端数量）
   - 支持拖拽排序（跨端类型）
   - 添加模板搜索功能

2. **功能扩展**
   - 支持模板导入导出（包含端类型）
   - 支持批量选择和修改
   - 添加端类型迁移向导

3. **性能优化**
   - 大量模板时的虚拟滚动
   - 筛选结果的缓存

4. **用户体验**
   - 添加键盘快捷键
   - 支持模板复制和克隆
   - 添加撤销/重做功能

## 📧 反馈

如有问题或建议，请：
1. 查看文档：`apps/web/docs/` 目录
2. 检查快速参考：`模板客户端类型快速参考.md`
3. 查看实现细节：`IMPLEMENTATION_SUMMARY_TEMPLATE_CLIENT_TYPE.md`

