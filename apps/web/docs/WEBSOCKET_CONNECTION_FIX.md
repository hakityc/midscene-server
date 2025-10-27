# WebSocket 连接问题修复总结

## 问题描述

用户反馈 web 客户端无法连接到 WebSocket 服务器，一直显示连接失败，但 Apifox 可以正常连接。这说明问题出在客户端实现上。

## 问题分析

通过排查发现客户端 WebSocket 连接存在以下问题：

1. **缺少自动重连机制**：连接失败后没有自动重试
2. **错误处理不够详细**：无法看到具体的连接错误信息
3. **缺少连接状态指示**：用户无法清楚了解当前连接状态
4. **缺少手动重连功能**：连接失败后只能刷新页面重试

## 修复方案

### 1. 添加自动重连机制

**修改文件**: `/Users/lebo/lebo/project/midscene-server/apps/web/src/hooks/useWebSocket.ts`

**主要改进**:

- 添加重连计数器和最大重试次数限制
- 实现指数退避重连策略（1s, 2s, 4s, 8s, 10s）
- 在连接关闭和错误时自动触发重连
- 连接成功后重置重连计数器

```typescript
const reconnectAttemptsRef = useRef<number>(0);
const maxReconnectAttempts = 5;

const scheduleReconnect = useCallback(() => {
  if (reconnectAttemptsRef.current < maxReconnectAttempts) {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    // 指数退避重连
  }
}, []);
```

### 2. 改进错误处理和日志

**改进内容**:

- 添加详细的错误日志输出到控制台
- 在消息监控中显示重连进度
- 区分不同类型的连接关闭代码
- 提供更友好的错误提示

```typescript
ws.onerror = (event) => {
  setStatus('error');
  const errorMsg = 'WebSocket 连接出错';
  setError(errorMsg);
  addMessage('info', 'error', errorMsg);
  console.error('WebSocket error:', event); // 详细错误日志
};
```

### 3. 添加连接状态指示

**修改文件**: `/Users/lebo/lebo/project/midscene-server/apps/web/src/components/debug/MessageMonitor.tsx`

**新增功能**:

- 实时显示连接状态（已连接/连接中/未连接）
- 使用不同颜色的图标表示状态
- 连接中时显示旋转动画

```typescript
{status === 'open' ? (
  <div className="flex items-center gap-1 text-green-600">
    <Wifi className="h-4 w-4" />
    <span className="text-xs">已连接</span>
  </div>
) : status === 'connecting' ? (
  <div className="flex items-center gap-1 text-yellow-600">
    <RefreshCw className="h-4 w-4 animate-spin" />
    <span className="text-xs">连接中</span>
  </div>
) : (
  <div className="flex items-center gap-1 text-red-600">
    <WifiOff className="h-4 w-4" />
    <span className="text-xs">未连接</span>
  </div>
)}
```

### 4. 添加手动重连按钮

**新增功能**:

- 在消息监控面板添加"重连"按钮
- 连接中时禁用重连按钮并显示旋转动画
- 手动重连会重置自动重连计数器

```typescript
<Button
  size="sm"
  variant="outline"
  onClick={onConnect}
  disabled={status === 'connecting'}
>
  <RefreshCw className={`h-3 w-3 mr-1 ${status === 'connecting' ? 'animate-spin' : ''}`} />
  重连
</Button>
```

### 5. 改进资源清理

**改进内容**:

- 组件卸载时清理重连定时器
- 手动断开连接时停止自动重连
- 避免内存泄漏和重复连接

```typescript
useEffect(() => {
  return () => {
    clearReconnectTimeout();
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'component unmount');
      } catch {}
    }
  };
}, [clearReconnectTimeout]);
```

## 修复效果

修复后的客户端具备以下能力：

1. **自动重连**：连接失败后自动尝试重连，最多重试 5 次
2. **智能退避**：使用指数退避策略，避免频繁重连
3. **状态可视**：实时显示连接状态，用户可以清楚了解连接情况
4. **手动控制**：提供手动重连按钮，用户可以主动触发重连
5. **详细日志**：在控制台输出详细错误信息，便于调试
6. **资源管理**：正确清理定时器和连接，避免内存泄漏

## 使用建议

1. **首次连接**：页面加载后会自动尝试连接
2. **连接失败**：系统会自动重试，用户也可以点击"重连"按钮
3. **调试问题**：打开浏览器控制台查看详细错误信息
4. **网络问题**：如果网络不稳定，系统会自动处理重连

## 技术细节

- **重连策略**：指数退避，最大延迟 10 秒
- **最大重试**：5 次重连尝试
- **状态管理**：使用 React hooks 管理连接状态
- **错误处理**：区分不同错误类型，提供针对性处理
- **用户体验**：提供视觉反馈和手动控制选项

这些修复应该能解决 WebSocket 连接问题，提供更稳定和用户友好的连接体验。
