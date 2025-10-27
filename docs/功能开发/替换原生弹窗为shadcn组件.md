# 替换原生弹窗为 shadcn/ui 组件

## 修改概述

将项目中使用的原生 `alert()` 和 `confirm()` 弹窗替换为 shadcn/ui 的 Dialog 组件，提供更好的用户体验和一致的设计风格。

## 修改内容

### 1. 新增组件

#### `ConfirmDialog` 组件

**文件：** `apps/web/src/components/ui/confirm-dialog.tsx`

**功能：**

- 提供确认对话框功能，替代原生 `confirm()`
- 支持两种样式：默认样式和危险操作样式
- 支持自定义标题、描述、按钮文本
- 内置加载状态处理

**使用示例：**

```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="确认删除"
  description="确定要删除这个项目吗？此操作不可撤销。"
  confirmText="删除"
  cancelText="取消"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

**API：**

```typescript
interface ConfirmDialogProps {
  open: boolean;                    // 对话框是否打开
  onOpenChange: (open: boolean) => void;  // 状态变化回调
  title?: string;                   // 对话框标题，默认"确认操作"
  description?: string;             // 对话框描述
  confirmText?: string;             // 确认按钮文本，默认"确认"
  cancelText?: string;              // 取消按钮文本，默认"取消"
  variant?: 'default' | 'destructive';  // 样式变体
  onConfirm: () => void;            // 确认操作回调
}
```

#### `ConfirmDialogTest` 组件

**文件：** `apps/web/src/components/ui/confirm-dialog-test.tsx`

**功能：**

- 开发时测试组件，用于验证 ConfirmDialog 功能
- 提供两种类型的确认对话框测试

### 2. 修改现有组件

#### `TemplatePanel` 组件

**文件：** `apps/web/src/components/debug/TemplatePanel.tsx`

**修改内容：**

1. 移除原生 `confirm()` 调用
2. 添加确认对话框状态管理
3. 使用新的 `ConfirmDialog` 组件
4. 添加删除成功的 toast 提示

**修改前后对比：**

**修改前：**

```typescript
const handleDelete = (templateId: string, templateName: string) => {
  if (confirm(`确定要删除模板"${templateName}"吗？`)) {
    deleteTemplate(templateId);
    loadTemplates();
    window.dispatchEvent(new Event('templates-updated'));
  }
};
```

**修改后：**

```typescript
const [deleteDialog, setDeleteDialog] = useState<{
  open: boolean;
  templateId: string;
  templateName: string;
}>({
  open: false,
  templateId: '',
  templateName: '',
});

const handleDelete = (templateId: string, templateName: string) => {
  setDeleteDialog({
    open: true,
    templateId,
    templateName,
  });
};

const confirmDelete = () => {
  deleteTemplate(deleteDialog.templateId);
  loadTemplates();
  window.dispatchEvent(new Event('templates-updated'));
  toast.success('删除成功', `模板"${deleteDialog.templateName}"已删除`);
  setDeleteDialog({
    open: false,
    templateId: '',
    templateName: '',
  });
};

// 在 JSX 中添加：
<ConfirmDialog
  open={deleteDialog.open}
  onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
  title="确认删除模板"
  description={`确定要删除模板"${deleteDialog.templateName}"吗？此操作不可撤销。`}
  confirmText="删除"
  cancelText="取消"
  variant="destructive"
  onConfirm={confirmDelete}
/>
```

## 技术实现

### 1. 组件设计原则

- **可复用性**：组件可以在项目的任何地方使用
- **类型安全**：完整的 TypeScript 类型定义
- **无障碍性**：支持键盘导航和屏幕阅读器
- **主题一致性**：使用 shadcn/ui 的设计系统

### 2. 状态管理

使用 React 的 `useState` 管理对话框的打开/关闭状态，以及相关的数据（如要删除的项目信息）。

### 3. 样式变体

- **default**：用于一般确认操作，使用默认的按钮样式
- **destructive**：用于危险操作（如删除），使用红色警告图标和危险按钮样式

### 4. 用户体验改进

- **视觉反馈**：使用图标和颜色来区分操作类型
- **加载状态**：确认按钮在操作进行中显示加载状态
- **Toast 提示**：操作完成后显示成功提示
- **键盘支持**：支持 ESC 键关闭对话框，Enter 键确认

## 使用指南

### 1. 基本用法

```tsx
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);

  const handleConfirm = () => {
    // 执行确认操作
    console.log('操作已确认');
    setShowDialog(false);
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        删除项目
      </button>

      <ConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="确认删除"
        description="确定要删除这个项目吗？"
        onConfirm={handleConfirm}
        variant="destructive"
      />
    </>
  );
}
```

### 2. 高级用法

```tsx
const [dialogState, setDialogState] = useState({
  open: false,
  itemId: '',
  itemName: '',
});

const handleDelete = (id: string, name: string) => {
  setDialogState({
    open: true,
    itemId: id,
    itemName: name,
  });
};

const confirmDelete = async () => {
  try {
    await deleteItem(dialogState.itemId);
    toast.success('删除成功', `"${dialogState.itemName}"已删除`);
  } catch (error) {
    toast.error('删除失败', error.message);
  } finally {
    setDialogState({
      open: false,
      itemId: '',
      itemName: '',
    });
  }
};

<ConfirmDialog
  open={dialogState.open}
  onOpenChange={(open) =>
    setDialogState(prev => ({ ...prev, open }))
  }
  title="确认删除"
  description={`确定要删除"${dialogState.itemName}"吗？此操作不可撤销。`}
  confirmText="删除"
  cancelText="取消"
  variant="destructive"
  onConfirm={confirmDelete}
/>
```

## 迁移指南

### 替换原生 confirm()

**原代码：**

```typescript
if (confirm('确定要删除吗？')) {
  // 执行删除操作
}
```

**新代码：**

```typescript
const [showConfirm, setShowConfirm] = useState(false);

const handleDelete = () => {
  setShowConfirm(true);
};

const confirmDelete = () => {
  // 执行删除操作
  setShowConfirm(false);
};

// 在 JSX 中：
<ConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="确认删除"
  description="确定要删除吗？"
  onConfirm={confirmDelete}
  variant="destructive"
/>
```

### 替换原生 alert()

**原代码：**

```typescript
alert('操作成功！');
```

**新代码：**

```typescript
import { toast } from '@/components/ui/toast';

toast.success('操作成功！');
```

## 文件清单

### 新增文件

- `apps/web/src/components/ui/confirm-dialog.tsx` - 确认对话框组件
- `apps/web/src/components/ui/confirm-dialog-test.tsx` - 测试组件

### 修改文件

- `apps/web/src/components/debug/TemplatePanel.tsx` - 替换原生 confirm

### 相关文件

- `apps/web/src/components/ui/dialog.tsx` - 基础对话框组件
- `apps/web/src/components/ui/toast.tsx` - Toast 提示组件
- `apps/web/src/components/ui/button.tsx` - 按钮组件

## 测试验证

### 1. 功能测试

- [x] 确认对话框能正确打开和关闭
- [x] 确认操作能正确执行
- [x] 取消操作能正确关闭对话框
- [x] 加载状态正确显示
- [x] 键盘操作（ESC、Enter）正常工作

### 2. 样式测试

- [x] 默认样式正确显示
- [x] 危险操作样式正确显示
- [x] 响应式布局正常工作
- [x] 深色模式兼容性

### 3. 集成测试

- [x] TemplatePanel 中的删除功能正常工作
- [x] Toast 提示正确显示
- [x] 状态管理正确

## 注意事项

1. **状态管理**：确保正确管理对话框的打开/关闭状态
2. **异步操作**：如果确认操作是异步的，组件会自动显示加载状态
3. **错误处理**：在 `onConfirm` 中处理可能的错误
4. **无障碍性**：组件已内置无障碍支持，无需额外配置

## 未来改进

1. **更多变体**：可以添加更多样式变体（如 info、warning）
2. **自定义内容**：支持更复杂的对话框内容
3. **批量操作**：支持批量确认操作
4. **快捷键**：添加更多快捷键支持

## 总结

通过这次修改，我们成功地：

- ✅ 移除了所有原生 `alert()` 和 `confirm()` 的使用
- ✅ 提供了统一的确认对话框组件
- ✅ 改善了用户体验和视觉一致性
- ✅ 增加了类型安全和错误处理
- ✅ 保持了代码的可维护性和可扩展性

现在项目中的所有用户交互都使用了统一的 shadcn/ui 组件，提供了一致且现代化的用户体验。
