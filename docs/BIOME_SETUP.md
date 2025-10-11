# Biome 配置指南

## 概述

本项目使用 [Biome](https://biomejs.dev/) 作为代码格式化和 lint 工具。Biome 是一个快速、现代的工具链，可以替代 ESLint 和 Prettier。

## Monorepo 架构

本项目采用 monorepo 架构，包含以下子项目：

- `apps/server` - 后端服务
- `apps/web` - 前端应用

## 配置结构

### 根目录配置

- **位置**: `/biome.json`
- **作用**: 作为基础配置，定义整个 monorepo 的默认规则
- **包管理**: Biome 安装在根目录的 `devDependencies` 中

### 子项目配置

- **apps/server/biome.json** - 继承根配置
- **apps/web/biome.json** - 继承根配置

每个子项目都有自己的 `biome.json`，可以覆盖或扩展根配置的规则。

## 安装

在项目根目录运行：

```bash
pnpm install
```

这会在根目录和所有子项目中安装必要的依赖，包括 Biome。

## VSCode 集成

### 安装扩展

1. 打开 VSCode
2. 安装 `Biome` 扩展（ID: `biomejs.biome`）
3. 或者，VSCode 会自动提示安装推荐的扩展

### 扩展配置

项目已配置 `.vscode/settings.json`，包含以下设置：

- 自动格式化（保存时）
- 自动修复 lint 问题
- 自动组织 imports
- 为 JS/TS/React 文件使用 Biome 作为默认格式化工具

## 使用方法

### 命令行

在项目根目录：

```bash
# 格式化代码
pnpm format

# 检查代码（lint + format）
pnpm check

# 自动修复问题
pnpm fix

# 仅运行 lint
pnpm lint
```

在子项目中（如 `apps/server`）：

```bash
cd apps/server

# 格式化当前目录
pnpm format

# 检查代码
pnpm check

# 自动修复
pnpm fix

# 仅 lint
pnpm lint
```

### VSCode 中使用

- **保存时自动格式化**: 代码会在保存时自动格式化
- **手动格式化**: `Shift + Alt + F` (Windows/Linux) 或 `Shift + Option + F` (Mac)
- **组织 imports**: 保存时自动执行

## 配置说明

### 主要规则

```json
{
  "formatter": {
    "lineWidth": 80,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single"
    }
  }
}
```

### 禁用的规则

以下规则已被禁用以适应项目需求：

- `useKeyWithClickEvents` - 允许 onClick 不配对 onKeyPress
- `useValidAnchor` - 放宽锚点标签验证
- `noParameterAssign` - 允许参数重新赋值
- `noNonNullAssertion` - 允许使用非空断言
- `noExplicitAny` - 允许显式 `any` 类型
- `useExhaustiveDependencies` - 不强制 React Hooks 依赖完整性

完整规则列表请查看各项目的 `biome.json` 文件。

## 忽略的文件和目录

以下目录会被 Biome 忽略：

- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `midscene_run/`
- 各种锁文件和日志文件

## 故障排除

### 问题：VSCode 中 Biome 扩展报错 "Unable to find the Biome binary"

**解决方案**:

1. 确保在项目根目录运行过 `pnpm install`
2. 重启 VSCode
3. 检查 VSCode 工作区是否指向 `/Users/lebo/lebo/project/midscene-server`
4. 如果问题仍然存在，尝试重新加载窗口：`Cmd + Shift + P` → "Developer: Reload Window"

### 问题：某个文件不应该被 lint

**解决方案**:

在相应的 `biome.json` 中添加到 `files.includes` 的排除列表：

```json
{
  "files": {
    "includes": [
      "**",
      "!**/your-file-or-directory"
    ]
  }
}
```

### 问题：想要修改某个规则

**解决方案**:

1. 如果是全局修改，编辑根目录的 `biome.json`
2. 如果只针对特定子项目，编辑该子项目的 `biome.json`

参考 [Biome 规则文档](https://biomejs.dev/linter/rules/)。

## 与其他工具的关系

- **TypeScript**: Biome 不替代 TypeScript 编译器，只负责格式化和 lint
- **ESLint**: 本项目使用 Biome 替代 ESLint
- **Prettier**: 本项目使用 Biome 替代 Prettier

## 最佳实践

1. **提交前检查**: 在提交代码前运行 `pnpm check`
2. **保持配置一致**: 避免在子项目中大量覆盖根配置
3. **使用自动修复**: 大部分问题可以通过 `pnpm fix` 自动修复
4. **团队协作**: 确保所有团队成员都安装了 Biome VSCode 扩展

## 参考资料

- [Biome 官方文档](https://biomejs.dev/)
- [Biome VSCode 扩展](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
- [Biome 配置参考](https://biomejs.dev/reference/configuration/)

