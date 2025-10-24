# 悬浮消息监控组件使用说明

## 概述

新的悬浮消息监控组件 `FloatingMessageMonitor` 提供了功能强大的实时消息展示和任务监控能力，替代了原有的卡片式消息监控组件。采用 macOS 通知风格设计，具有毛玻璃效果、优雅的圆角和柔和的阴影。

## 核心特性

### 1. 双模式展示

#### 层叠状态（默认）
- 右上角纵向堆叠展示最新 5 条消息
- 新消息通过淡入 + 上移动画推入队列
- 旧消息自动向后堆叠（重叠 8px）
- 未读消息显示蓝色环形边框（ring-2）
- 支持点击展开查看完整列表
- **macOS 风格**：毛玻璃背景（backdrop-blur-xl）+ 半透明效果（bg-white/80）

#### 展开状态
- 320px 宽度的完整消息列表
- 实时显示所有任务记录（最多保留 100 条）
- 新任务到达时列表顶部自动追加
- 成功任务 1 秒内高亮显示（绿色背景）
- 自动收起：3 秒无操作后自动返回层叠状态

### 2. 消息内容展示

#### 层叠状态
- **左侧**：任务状态指示器
  - 🟢 绿色圆点：成功任务
  - 🔴 红色圆点：失败任务
  - 🟡 黄色脉冲圆点：执行中任务
  - ⚪ 灰色圆点：待处理任务
  - 🟠 橙色圆点：已取消任务
- **中间**：任务摘要（单行截断显示）
- **右侧**：时间戳（精确到分钟，如 "14:32"）
- **进度条**：执行中任务显示黄色进度条

#### 展开状态
- **头部**：
  - 任务 ID 缩写（如 "#T2023"）
  - 任务完整描述（支持多行）
- **时间信息**：
  - 精确时间（如 "14:32:18"）
  - 执行耗时（如 "耗时 2.4s"）
- **错误信息**：失败任务显示错误代码
- **进度信息**：执行中任务显示详细进度条和百分比
- **快捷操作**：
  - 成功任务 → "查看" 按钮
  - 失败任务 → "重试" 按钮
  - 执行中 → "取消" 按钮

### 3. 顶部操作按钮栏

**新设计**：位于消息列表正上方，统一圆角背景容器内，视觉整体性更强：

- 🎨 **毛玻璃圆角背景**：backdrop-blur-xl + rounded-2xl
- 📏 **优雅的分隔线**：按钮组之间使用细线分隔
- 🔘 **统一样式**：所有按钮使用 ghost 样式 + rounded-xl 圆角

#### 按钮功能

- **重连按钮**：
  - WebSocket 连接状态指示
  - 断连时红色闪烁动画
  - 点击手动重连
  
- **报告按钮**：
  - 导出全量任务日志
  - 打开最新的 Midscene 报告
  - 加载时显示旋转图标

- **清空按钮**（下拉菜单）：
  - "清空已完成"：仅清除成功和失败任务
  - "清空全部"：清除所有消息
  - 显示未读消息数角标（红色渐变圆形角标）

- **暂停通知按钮**：
  - 点击后暂时屏蔽 3 分钟内非重要通知
  - 自动倒计时，3 分钟后恢复
  - 暂停期间按钮置灰显示状态

### 4. 交互特性

#### 实时反馈
- 新任务到达时，层叠区域轻微抖动 2 次（0.3 秒动画）
- 执行中任务进度实时更新
- 成功任务到达时短暂高亮（1 秒绿色背景）

#### 连接状态联动
- 断连时顶部显示"连接已中断"提示条
- 重连按钮与连接状态同步（连接中/已连接/已断开）
- 断连状态下消息列表顶部显示快捷重连入口

#### 底部操作（展开状态）
- **导出成功**：导出所有成功任务记录为 JSON
- **清除完成**：清除已完成任务（成功和失败）

## 数据结构

### MonitorMessage 扩展属性

```typescript
interface MonitorMessage {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received' | 'info';
  type: 'success' | 'error' | 'info';
  content: string;
  data?: unknown;
  // 扩展属性
  taskId?: string;        // 任务 ID
  taskStatus?: TaskStatus; // 任务状态
  taskProgress?: number;   // 任务进度 (0-100)
  duration?: number;       // 任务执行时长(毫秒)
  errorCode?: string;      // 错误代码
  isRead?: boolean;        // 是否已读
}

type TaskStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';
```

## 使用示例

### 基本使用

```tsx
import { FloatingMessageMonitor } from '@/components/debug/FloatingMessageMonitor';

<FloatingMessageMonitor
  messages={messages}
  onClear={clearMessages}
  onClearCompleted={clearCompletedMessages}
  status={status}
  onConnect={connect}
  onRetryTask={handleRetryTask}
  onCancelTask={handleCancelTask}
/>
```

### 创建带任务属性的消息

```typescript
const message: MonitorMessage = {
  id: 'msg-1',
  timestamp: Date.now(),
  direction: 'received',
  type: 'success',
  content: '数据同步任务完成',
  taskId: 'T202310160001',
  taskStatus: 'success',
  duration: 2400, // 2.4 秒
  isRead: false,
};
```

### 创建带进度的执行中任务

```typescript
const runningMessage: MonitorMessage = {
  id: 'msg-2',
  timestamp: Date.now(),
  direction: 'info',
  type: 'info',
  content: '正在处理数据...',
  taskId: 'T202310160002',
  taskStatus: 'running',
  taskProgress: 45, // 45%
  isRead: false,
};
```

### 创建失败任务

```typescript
const errorMessage: MonitorMessage = {
  id: 'msg-3',
  timestamp: Date.now(),
  direction: 'received',
  type: 'error',
  content: '数据验证失败',
  taskId: 'T202310160003',
  taskStatus: 'error',
  duration: 1200,
  errorCode: 'ERR_VALIDATION_001',
  isRead: false,
};
```

## 动画效果

### 淡入动画
- 新消息出现时使用 `animate-in fade-in slide-in-from-top-2`
- 持续时间：300ms
- 缓动函数：ease-out

### 抖动动画
- 新消息到达时触发
- 左右摆动 4px，重复 2 次
- 总持续时间：600ms

### 展开/收起动画
- 展开：`fade-in zoom-in-95`
- 持续时间：200ms
- 缓动函数：cubic-bezier

### 进度条动画
- 宽度变化使用 `transition-all duration-300`
- 平滑过渡效果

## 样式定制

组件使用 Tailwind CSS 构建，采用 macOS 通知风格设计，支持深色模式：

### 毛玻璃效果
- **背景虚化**：`backdrop-blur-xl` - 12px 模糊半径
- **半透明背景**：`bg-white/80` 或 `bg-white/90` - 80-90% 不透明度
- **适配深色模式**：`dark:bg-gray-800/80`

### 圆角设计
- **大圆角**：`rounded-2xl` - 16px 圆角（按钮容器、消息卡片）
- **中圆角**：`rounded-xl` - 12px 圆角（按钮、内部卡片）
- **小圆角**：`rounded-lg` 或 `rounded-full` - 用于细节元素

### 阴影层次
- **外层容器**：`shadow-lg` - 较柔和的阴影
- **展开面板**：`shadow-2xl` - 更深的阴影
- **悬停效果**：`hover:shadow-xl` - 动态阴影变化

### 边框透明度
- **容器边框**：`border-gray-200/50` - 50% 透明度
- **未读标识**：`ring-2 ring-blue-400/30` - 蓝色环形边框 + 30% 透明度
- **深色模式**：`dark:border-gray-700/50`

### 渐变效果
- **进度条**：`bg-gradient-to-r from-yellow-400 to-yellow-500`
- **角标**：`bg-gradient-to-r from-red-500 to-red-600`

### 状态指示器
- 2px 圆点（`w-2 h-2 rounded-full`）
- 不同颜色表示不同状态
- 执行中任务带 `animate-pulse` 脉冲动画

### 布局结构
```
固定定位容器 (fixed top-4 right-4 z-50)
└─ 垂直布局 (flex flex-col gap-2)
   ├─ 按钮容器 (毛玻璃圆角背景)
   │  └─ 水平排列按钮 (gap-1.5, 分隔线)
   └─ 消息列表容器
      ├─ 层叠状态：5 条卡片堆叠
      └─ 展开状态：完整列表 (max-h-[600px])
```

## 性能优化

- 消息列表最多保留 100 条记录
- 使用 `useCallback` 优化事件处理函数
- 使用 `useRef` 避免不必要的重渲染
- 自动收起定时器在组件卸载时自动清理

## 注意事项

1. **消息数量限制**：为了性能考虑，消息列表最多保留 100 条
2. **自动收起**：展开状态下 3 秒无操作自动收起
3. **暂停通知**：暂停期间只屏蔽非重要通知，重要通知仍会显示
4. **连接状态**：断连时会自动尝试重连（最多 5 次）
5. **浏览器兼容性**：需要支持 CSS 动画和 Flexbox 的现代浏览器

## 后续扩展建议

1. **消息分类过滤**：增加按状态过滤消息的功能
2. **消息搜索**：支持搜索特定任务 ID 或内容
3. **消息详情弹窗**：点击消息查看完整的 JSON 数据
4. **声音提醒**：重要消息到达时播放提示音
5. **桌面通知**：使用浏览器 Notification API 发送桌面通知
6. **消息持久化**：将消息保存到 localStorage 或 IndexedDB

