# Midscene Server Monorepo

基于 Hono 和 Midscene 的 WebSocket 服务器，用于浏览器自动化和任务执行。

## 📚 项目结构

```
midscene-server/
├── apps/
│   ├── server/          # WebSocket 服务器
│   └── web/             # Web 客户端
├── docs/                # 项目文档
│   ├── 开发规范.md       # ⭐ 完整开发规范
│   ├── 开发规范-快速参考.md # ⭐ 快速参考
│   ├── 功能开发/        # 功能开发文档
│   ├── 架构重构/        # 架构重构文档
│   └── 问题修复/        # 问题修复文档
└── pnpm-workspace.yaml  # Monorepo 配置
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动所有应用
pnpm dev

# 仅启动服务器
pnpm server:dev

# 仅启动 Web 客户端
pnpm web:dev
```

### 构建

```bash
# 构建所有应用
pnpm build

# 构建服务器
pnpm server:build
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm --filter @midscene/server test:coverage
```

### 代码质量

```bash
# 格式化代码
pnpm format

# 检查代码质量
pnpm check

# 自动修复问题
pnpm fix

# Lint 代码
pnpm lint
```

## 📖 文档导航

### 核心文档

- **[开发规范](./docs/开发规范.md)** ⭐ 必读
  - 代码风格与格式化
  - 命名规范
  - 架构与设计模式
  - 类型定义规范
  - 错误处理规范
  - 日志规范
  - WebSocket 通信规范
  - 测试规范
  - 文档规范
  - Git 提交规范

- **[开发规范 - 快速参考](./docs/开发规范-快速参考.md)** ⚡ 速查

### 架构文档

- [架构重构完成总结](./docs/架构重构/README.md)
- [服务层重构方案](./docs/架构重构/服务层重构方案.md)
- [代码对比与迁移指南](./docs/架构重构/代码对比与迁移指南.md)

### 技术文档

- [WebSocket 传值说明](./docs/WebSocket传值说明.md)
- [Monorepo 使用指南](./docs/Monorepo使用指南.md)
- [Windows-DPI 快速参考](./docs/Windows-DPI快速参考.md)
- [FlowAction 配置化快速参考](./docs/FlowAction配置化快速参考.md)

### 功能开发文档

- [node-screenshots 集成与窗口级截图功能](./docs/功能开发/node-screenshots集成与窗口级截图功能.md)
- [Windows-connectWindow 功能实现](./docs/功能开发/Windows-connectWindow功能实现.md)
- [Windows 截图质量压缩优化](./docs/功能开发/Windows截图质量压缩优化.md)

### 问题修复文档

- [Windows 点击位置偏差问题修复](./docs/修复报告-Windows点击位置偏差问题.md)
- [JsonPreview 输入渲染冲突问题修复](./docs/问题修复/JsonPreview输入渲染冲突问题修复.md)
- [变量语法与环境变量冲突问题修复](./docs/问题修复/变量语法与环境变量冲突问题修复.md)

## 🏗️ 技术栈

### Server

- **框架**: Hono
- **AI**: Mastra, Midscene
- **数据库**: LibSQL
- **构建工具**: tsup
- **测试**: Vitest
- **代码质量**: Biome

### Web

- **框架**: React + Vite
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS
- **构建工具**: Vite

## 📦 项目应用

### Server (`apps/server`)

WebSocket 服务器，提供以下功能：

- 🌐 WebSocket 通信支持
- 🤖 AI 驱动的浏览器自动化
- 🎯 任务执行和管理
- 🪟 Windows 客户端集成
- 📊 健康检查和监控

**详细文档**: [apps/server/README.md](./apps/server/README.md)

### Web (`apps/web`)

Web 客户端，提供以下功能：

- 💬 与服务器的 WebSocket 通信
- 🎨 现代化的 UI 界面
- 📋 任务管理和执行
- 📊 实时状态监控

**详细文档**: [apps/web/README.md](./apps/web/README.md)

## 🛠️ 开发规范

### 新开发者必读

1. **[开发规范](./docs/开发规范.md)** - 详细的开发规范文档
2. **[快速参考](./docs/开发规范-快速参考.md)** - 常用规范速查
3. **[架构重构 README](./docs/架构重构/README.md)** - 了解项目架构

### 核心原则

1. ✅ **代码质量优先**：使用 Biome 保持代码整洁
2. ✅ **类型安全**：避免使用 `any`，充分利用 TypeScript
3. ✅ **单一职责**：每个函数/类只做一件事
4. ✅ **DRY 原则**：不要重复自己（Don't Repeat Yourself）
5. ✅ **测试驱动**：关键功能必须有测试覆盖

### 代码风格

```bash
# 使用 Biome 自动格式化
pnpm format

# 检查代码质量
pnpm check

# 自动修复问题
pnpm fix
```

### Git 提交规范

```bash
# 提交格式：<type>(<scope>): <subject>
git commit -m "feat(service): 添加新功能"
git commit -m "fix(websocket): 修复连接问题"
git commit -m "refactor(handler): 重构 Handler"
```

**详细规范**: [开发规范 - Git 提交规范](./docs/开发规范.md#10-git-提交规范)

## 📝 文档规范

### 何时编写文档

✅ **必须编写文档**：

- 大型重构或架构变更
- 新功能开发
- 高价值问题修复
- 性能优化

❌ **不需要文档**：

- 简单 Bug 修复
- 代码格式调整
- 依赖升级（无 Breaking Changes）

### 文档分类

文档应保存到 `docs/` 目录，按以下分类：

```
docs/
├── 功能开发/        # 新功能开发文档
├── 架构重构/        # 架构重构文档
├── 问题修复/        # Bug 修复文档
└── 性能优化/        # 性能优化文档
```

### 文档命名

- ✅ 使用中文名称
- ✅ 简洁明了（不超过 20 个汉字）
- ✅ 包含关键词

**详细规范**: [开发规范 - 文档规范](./docs/开发规范.md#9-文档规范)

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行服务器测试
pnpm --filter @midscene/server test

# 查看测试覆盖率
pnpm --filter @midscene/server test:coverage

# 测试 UI
pnpm --filter @midscene/server test:ui
```

### 测试覆盖率目标

| 类型 | 覆盖率目标 |
|------|----------|
| 核心服务类 | ≥ 85% |
| Handler 函数 | ≥ 80% |
| 工具函数 | ≥ 90% |

**详细规范**: [开发规范 - 测试规范](./docs/开发规范.md#8-测试规范)

## 🏛️ 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│         WebSocket Layer             │
│  (handlers, builders, helpers)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          Service Layer              │
│  (BaseOperateService + 子类)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Integration Layer           │
│  (Midscene, Mastra, MCP)            │
└─────────────────────────────────────┘
```

### 核心设计模式

- **单例模式**: 所有 Service 类
- **工厂模式**: Handler 创建
- **模板方法模式**: Service 基类和子类
- **策略模式**: 不同平台的执行策略

**详细文档**: [架构重构完成总结](./docs/架构重构/README.md)

## 🔄 重构成果

最近完成的服务层重构取得了显著成效：

- ✅ 减少 **41.6%** 的代码量（1152 行）
- ✅ 消除 **70%** 的代码重复
- ✅ 提升测试覆盖率到 **85%**
- ✅ 减少 **70%** 的 `any` 使用
- ✅ 引入清晰的架构和设计模式

**详细文档**: [服务层重构方案](./docs/架构重构/服务层重构方案.md)

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feat/new-feature`)
3. 遵循开发规范编写代码
4. 添加测试并确保通过
5. 运行代码质量检查 (`pnpm check`)
6. 提交代码 (`git commit -m "feat: 添加新功能"`)
7. 推送到分支 (`git push origin feat/new-feature`)
8. 创建 Pull Request

### 开发前必读

- [开发规范](./docs/开发规范.md)
- [架构重构 README](./docs/架构重构/README.md)
- [代码对比与迁移指南](./docs/架构重构/代码对比与迁移指南.md)

## 📞 联系和支持

如有问题或建议，请：

- 创建 Issue 进行讨论
- 查阅相关文档
- 联系项目负责人

## 📄 许可证

Private

---

**最后更新**: 2025年10月24日
**项目版本**: v1.0.0
