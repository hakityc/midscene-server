# 模板客户端类型配置说明

## 功能概述

模板现在支持区分 Web 端和 Windows 端，可以在快速模板面板中筛选和查看不同端的模板。

## 功能特性

1. **端类型标识**：每个模板显示对应的端类型标签（Web/Windows）
2. **端类型筛选**：可以按全部、Web 端、Windows 端筛选模板
3. **自动保存类型**：保存新模板时自动记录当前的客户端类型
4. **自动加载类型**：加载模板时自动切换到对应的客户端类型
5. **一键编辑类型**：可以通过 UI 界面快速修改模板的客户端类型

## 使用方法

### 创建模板

1. 在表单中选择客户端类型（Web 或 Windows）
2. 配置任务流程
3. 点击"保存为模板"按钮
4. 模板会自动记录当前的客户端类型

### 筛选模板

在快速模板面板顶部有三个筛选按钮：

- **全部**：显示所有模板
- **Web**：仅显示 Web 端模板
- **Windows**：仅显示 Windows 端模板

### 修改模板类型（UI 方式）

1. 在快速模板面板中找到要修改的模板
2. 点击模板右侧的 **编辑按钮**（铅笔图标）
3. 在下拉菜单中选择：
   - **设为 Web 端**
   - **设为 Windows 端**
4. 系统会自动保存并更新模板类型

### 加载模板

1. 在快速模板面板中点击"使用"按钮
2. 系统会自动：
   - 加载模板的任务配置
   - 切换到模板对应的客户端类型
   - 更新表单中的所有参数

## 批量更新现有模板

如果你有已保存的模板需要更新客户端类型（例如腾讯会议相关的模板应该标记为 Windows 端），可以按以下步骤操作：

### 方法一：在浏览器控制台中执行脚本

1. 在 Midscene Debug Tool 页面打开浏览器开发者工具（F12）
2. 切换到 Console（控制台）标签
3. 执行以下脚本来更新特定模板的类型：

```javascript
// 将包含"腾讯会议"关键词的模板设置为 Windows 端
const { updateTemplatesClientType } = await import('/src/utils/templateStorage.ts');
const count = updateTemplatesClientType(['腾讯会议'], 'windows');
console.log(`已更新 ${count} 个模板为 Windows 端`);
```

### 方法二：手动编辑 localStorage

1. 在浏览器开发者工具中打开 Application/存储 标签
2. 找到 Local Storage > midscene-templates
3. 编辑 JSON 数据，为需要的模板添加 `"clientType": "windows"` 字段
4. 刷新页面

### 方法三：删除并重建模板

1. 在需要修改的端类型下（Web/Windows）创建新模板
2. 删除旧模板

## 示例：批量更新多个模板

```javascript
// 将多个关键词匹配的模板设置为 Windows 端
const { updateTemplatesClientType } = await import('/src/utils/templateStorage.ts');

// 更新腾讯会议相关模板
const count = updateTemplatesClientType(
  ['腾讯会议', 'VooV Meeting', '会议'],  // 支持部分匹配
  'windows'
);
console.log(`已更新 ${count} 个模板为 Windows 端`);
```

## 默认行为

- 新保存的模板会自动记录当前的客户端类型
- 没有 `clientType` 字段的旧模板会默认显示为 Web 端
- 加载模板时会自动切换到对应的客户端类型
