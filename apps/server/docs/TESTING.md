# 单元测试指南

本项目使用 [Vitest](https://vitest.dev/) 作为单元测试框架。

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
# 运行所有测试（watch 模式）
pnpm test

# 运行所有测试（单次运行）
pnpm test:run

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 使用 UI 界面运行测试
pnpm test:ui

# watch 模式（自动重新运行）
pnpm test:watch
```

## 测试结构

测试文件位于对应源码目录的 `__tests__` 子目录中：

```
src/
├── utils/
│   ├── __tests__/
│   │   ├── response.test.ts
│   │   └── error.test.ts
│   ├── response.ts
│   └── error.ts
└── websocket/
    └── builders/
        ├── __tests__/
        │   └── messageBuilder.test.ts
        └── messageBuilder.ts
```

## 已测试的模块

### 1. `utils/response.ts`

- ✅ 成功响应构建
- ✅ 错误响应构建
- ✅ 自定义状态码
- ✅ 各种数据类型处理

**测试数量**: 10 个测试用例

### 2. `utils/error.ts`

- ✅ AppError 自定义错误类
- ✅ 错误处理中间件
- ✅ 不同错误类型的处理
- ✅ 开发/生产环境差异

**测试数量**: 13 个测试用例

### 3. `websocket/builders/messageBuilder.ts`

- ✅ WebSocket 消息构建
- ✅ 成功/错误响应
- ✅ 系统消息和广播消息
- ✅ 边界情况处理

**测试数量**: 27 个测试用例

### 4. `utils/taskTipFormatter.ts`

- ✅ Planning/Insight/Action/Log 阶段格式化
- ✅ 各种任务类型的提示转换
- ✅ 边界情况和错误处理
- ✅ 大小写不敏感处理
- ✅ 任务阶段描述获取

**测试数量**: 56 个测试用例

### 5. `services/windowsClientConnectionManager.ts`

- ✅ 单例模式
- ✅ 客户端注册/注销
- ✅ 心跳更新
- ✅ 客户端选择（负载均衡）
- ✅ 请求发送和响应处理
- ✅ 事件发射
- ✅ 统计信息
- ✅ 资源清理

**测试数量**: 28 个测试用例（1 个跳过）

## 编写测试的最佳实践

### 1. 测试文件命名

测试文件应该与源文件同名，并以 `.test.ts` 或 `.spec.ts` 结尾：

```
源文件: utils/response.ts
测试文件: utils/__tests__/response.test.ts
```

### 2. 测试结构

使用 `describe` 和 `it` 组织测试：

```typescript
import { describe, it, expect } from 'vitest';

describe('功能模块名称', () => {
  describe('子功能或方法名', () => {
    it('应该正确处理某种情况', () => {
      // 准备 (Arrange)
      const input = 'test';
      
      // 执行 (Act)
      const result = myFunction(input);
      
      // 断言 (Assert)
      expect(result).toBe('expected');
    });
  });
});
```

### 3. Mock 依赖

使用 `vi.mock()` 来模拟外部依赖：

```typescript
import { vi } from 'vitest';

vi.mock('../logger', () => ({
  serverLogger: {
    error: vi.fn(),
  },
}));
```

### 4. 清理副作用

在每个测试前清理状态：

```typescript
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(1000000);
});
```

## 建议扩展测试的模块

以下模块包含重要业务逻辑，建议添加单元测试：

### 高优先级

1. **`services/taskService.ts`** - 任务服务（需要优化 mastra mock 策略）
2. **`websocket/actions/command.ts`** - WebSocket 命令处理
3. **`websocket/helpers/clientCommandHelper.ts`** - 客户端命令辅助函数
4. **`services/browserService.ts`** - 浏览器服务

### 中优先级

5. **`mastra/agents/context/context-manager.ts`** - 上下文管理
6. **`mastra/agents/error/error-handler.ts`** - 错误处理逻辑
7. **`services/windowsOperateService.ts`** - Windows 操作服务
8. **`services/webOperateService.ts`** - Web 操作服务（集成测试更合适）

## 测试覆盖率

运行 `pnpm test:coverage` 生成覆盖率报告，报告将生成在 `coverage/` 目录：

```bash
pnpm test:coverage

# 查看 HTML 报告
open coverage/index.html
```

## 持续集成

可以在 CI/CD 流程中添加测试步骤：

```yaml
# .github/workflows/test.yml 示例
- name: Run tests
  run: pnpm test:run

- name: Generate coverage
  run: pnpm test:coverage
```

## 调试测试

### 使用 VS Code 调试

1. 在测试文件中设置断点
2. 打开 Debug 面板
3. 选择 "JavaScript Debug Terminal"
4. 运行 `pnpm test`

### 使用 Vitest UI

```bash
pnpm test:ui
```

在浏览器中打开 UI 界面，可以：

- 查看测试执行情况
- 过滤特定测试
- 查看测试覆盖率
- 查看测试执行时间

## 常见问题

### Q: 如何只运行特定的测试文件？

```bash
pnpm vitest src/utils/__tests__/response.test.ts
```

### Q: 如何只运行特定的测试用例？

使用 `.only`：

```typescript
it.only('应该测试这个用例', () => {
  // 测试代码
});
```

### Q: 如何跳过某个测试？

使用 `.skip`：

```typescript
it.skip('暂时跳过这个测试', () => {
  // 测试代码
});
```

### Q: 测试中如何模拟时间？

```typescript
import { vi } from 'vitest';

vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));

// 测试代码

vi.useRealTimers();
```

## 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [测试最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [如何编写好的单元测试](https://martinfowler.com/articles/practical-test-pyramid.html)

## 测试统计

- **总测试文件**: 5
- **总测试用例**: 134 (通过) + 1 (跳过)
- **测试状态**: ✅ 全部通过
- **总体覆盖率**: 核心工具模块和服务层覆盖率较高

### 测试文件详情

| 文件 | 测试用例数 | 状态 |
|------|-----------|------|
| `utils/__tests__/response.test.ts` | 10 | ✅ 通过 |
| `utils/__tests__/error.test.ts` | 13 | ✅ 通过 |
| `websocket/builders/__tests__/messageBuilder.test.ts` | 27 | ✅ 通过 |
| `utils/__tests__/taskTipFormatter.test.ts` | 56 | ✅ 通过 |
| `services/__tests__/windowsClientConnectionManager.test.ts` | 28 + 1 跳过 | ✅ 通过 |
| **总计** | **134 + 1** | **✅ 100%** |

最后更新: 2025-10-11
