# 🎨 主题切换指南

## 快速开始

### 1. 安装依赖

```bash
cd /Users/lebo/lebo/project/midscene-server/apps/web
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 切换主题

打开浏览器访问 <http://localhost:5173，点击右上角的> 🌞/🌙 图标切换主题。

## 🌓 主题模式

### Light Mode（亮色模式）

- 白色背景，深色文字
- 适合明亮环境使用
- 清爽简洁的视觉效果

### Dark Mode（暗色模式）

- 深色背景，浅色文字
- 适合夜间或低光环境
- 减少眼睛疲劳

### System Mode（跟随系统）

- 自动跟随操作系统主题设置
- 系统切换时实时响应
- 默认模式

## 🎯 主要特性

### ✨ shadcn/ui 原生风格

- 圆角设计
- 柔和阴影
- 现代配色
- 流畅动画

### 🔄 主题持久化

- 选择会自动保存
- 刷新页面后保持
- 使用 LocalStorage 存储

### 📱 响应式设计

- 移动端友好
- 桌面端优化
- 所有设备完美显示

## 🎨 自定义主题

### 修改颜色

编辑 `src/index.css` 文件：

```css
:root {
  --primary: oklch(0.205 0 0);          /* 主色 */
  --secondary: oklch(0.97 0 0);         /* 次要色 */
  --accent: oklch(0.97 0 0);            /* 强调色 */
  --destructive: oklch(0.577 0.245 27); /* 危险色 */
  /* ... */
}

.dark {
  --primary: oklch(0.922 0 0);          /* 暗色模式主色 */
  --secondary: oklch(0.269 0 0);        /* 暗色模式次要色 */
  /* ... */
}
```

### 调整圆角

修改 `--radius` 变量：

```css
:root {
  --radius: 0.5rem;  /* 默认 */
  /* --radius: 0rem;     完全直角 */
  /* --radius: 1rem;     更圆润 */
}
```

## 💡 使用建议

### 推荐场景

✅ **亮色模式**：

- 白天办公
- 明亮环境
- 需要打印或截图

✅ **暗色模式**：

- 夜间工作
- 弱光环境
- 长时间使用

### 快捷操作

1. **快速切换**：点击 🌞/🌙 图标
2. **跟随系统**：首次使用默认跟随系统
3. **记忆选择**：手动选择后会记住你的偏好

## 🔧 开发者信息

### 主题 Hook

```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme, actualTheme } = useTheme();
  
  // theme: 'light' | 'dark' | 'system'
  // actualTheme: 'light' | 'dark' (实际应用的主题)
  
  return (
    <button onClick={() => setTheme('dark')}>
      切换到暗色模式
    </button>
  );
}
```

### 主题变量

所有可用的 CSS 变量：

```css
--background          /* 背景色 */
--foreground          /* 前景色 */
--card                /* 卡片背景 */
--card-foreground     /* 卡片文字 */
--popover             /* 弹出层背景 */
--popover-foreground  /* 弹出层文字 */
--primary             /* 主色 */
--primary-foreground  /* 主色文字 */
--secondary           /* 次要色 */
--secondary-foreground/* 次要色文字 */
--muted               /* 柔和背景 */
--muted-foreground    /* 柔和文字 */
--accent              /* 强调色 */
--accent-foreground   /* 强调色文字 */
--destructive         /* 危险色 */
--border              /* 边框色 */
--input               /* 输入框边框 */
--ring                /* 焦点环 */
```

### 在组件中使用

```tsx
// ❌ 不推荐：硬编码颜色
<div className="bg-white text-black">

// ✅ 推荐：使用主题变量
<div className="bg-background text-foreground">

// ✅ 推荐：使用语义化类名
<div className="bg-card text-card-foreground">
<div className="bg-muted text-muted-foreground">
<div className="bg-primary text-primary-foreground">
```

## 📸 截图对比

### Light Mode

```
┌─────────────────────────────────────┐
│ Midscene Debug Tool      ☀️ 🌞      │ ← 主题切换
├─────────────────────────────────────┤
│ 白色背景、深色文字、清爽简洁           │
└─────────────────────────────────────┘
```

### Dark Mode

```
┌─────────────────────────────────────┐
│ Midscene Debug Tool      🌙 ☾       │ ← 主题切换
├─────────────────────────────────────┤
│ 深色背景、浅色文字、护眼舒适           │
└─────────────────────────────────────┘
```

## 🐛 常见问题

### Q: 主题没有切换？

A: 检查浏览器控制台是否有错误，确保 JavaScript 正常运行。

### Q: 刷新后主题重置？

A: 检查浏览器是否允许 LocalStorage，某些隐私模式可能禁用。

### Q: 暗色模式颜色太浅/太深？

A: 编辑 `src/index.css` 中的 `.dark` 部分调整颜色。

### Q: 想要更多主题颜色？

A: 目前支持亮色/暗色，未来会添加更多预设主题。

## 🎉 享受新主题

现在你可以在任何环境下舒适地使用 Midscene Debug Tool 了！

有问题或建议？随时反馈！🚀
