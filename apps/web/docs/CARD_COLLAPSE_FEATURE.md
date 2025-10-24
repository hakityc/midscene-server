# Card 折叠功能说明

## 概述

Card 组件现在支持可折叠功能，允许用户点击按钮来展开或收起卡片内容。

## 功能特性

- ✅ 支持折叠/展开卡片内容（`CardContent` 和 `CardFooter`）
- ✅ 平滑的过渡动画效果
- ✅ 可配置默认折叠状态
- ✅ 完全的键盘无障碍访问支持
- ✅ 自动显示折叠/展开图标
- ✅ 符合无障碍标准（使用原生 `button` 元素和 ARIA 属性）

## 使用方法

### 基础用法

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function CollapsibleCard() {
  return (
    <Card collapsible>
      <CardHeader>
        <CardTitle>可折叠的卡片</CardTitle>
      </CardHeader>
      <CardContent>
        <p>这里是卡片内容，可以被折叠和展开。</p>
      </CardContent>
    </Card>
  );
}
```

### 默认折叠状态

如果你想让卡片默认处于折叠状态：

```tsx
<Card collapsible defaultCollapsed>
  <CardHeader>
    <CardTitle>默认折叠的卡片</CardTitle>
  </CardHeader>
  <CardContent>
    <p>这个内容默认是隐藏的。</p>
  </CardContent>
</Card>
```

### 完整示例

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ExampleCard() {
  return (
    <Card collapsible>
      <CardHeader>
        <CardTitle>用户信息</CardTitle>
        <CardDescription>查看和编辑用户详细信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="font-semibold">姓名：</span> 张三
          </div>
          <div>
            <span className="font-semibold">邮箱：</span> zhangsan@example.com
          </div>
          <div>
            <span className="font-semibold">电话：</span> 138-0000-0000
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button>编辑</Button>
      </CardFooter>
    </Card>
  );
}
```

## API 参考

### Card Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `collapsible` | `boolean` | `false` | 是否启用折叠功能 |
| `defaultCollapsed` | `boolean` | `false` | 默认是否处于折叠状态（仅在 `collapsible` 为 `true` 时有效） |
| ...其他 | `React.HTMLAttributes<HTMLDivElement>` | - | 继承标准 div 元素的所有属性 |

## 实现细节

### 组件结构

折叠功能通过 React Context 实现，主要包含以下部分：

1. **CardContext**：提供折叠状态和控制方法
2. **Card**：根组件，管理折叠状态
3. **CardHeader**：显示折叠/展开按钮
4. **CardContent/CardFooter**：在折叠时隐藏

### 无障碍支持

- 使用原生 `<button>` 元素作为折叠控制按钮
- 提供中文 `aria-label`（"展开" / "收起"）
- SVG 图标标记为 `aria-hidden="true"`
- 支持键盘操作（点击 Enter 或 Space）

### 动画效果

- 折叠图标使用 CSS `transform` 进行旋转动画
- 展开时图标向下（0度）
- 折叠时图标向左（-90度）
- 过渡时间为 200ms

### 样式

折叠按钮具有以下交互效果：

- 悬停时显示背景色（`hover:bg-accent`）
- 圆角边框（`rounded-sm`）
- 平滑的颜色过渡

## 注意事项

1. 当 `collapsible` 为 `false` 或未设置时，Card 行为与原版本完全相同
2. 折叠状态由 Card 组件内部管理，目前不支持外部控制（受控组件模式）
3. `CardHeader` 必须存在才能显示折叠按钮
4. 折叠时 `CardContent` 和 `CardFooter` 会完全卸载（返回 `null`），而非仅仅隐藏

## 浏览器兼容性

本功能使用的所有特性都是现代浏览器广泛支持的：

- CSS transitions
- CSS transforms
- React Context
- React Hooks

支持所有主流浏览器的最新版本。
