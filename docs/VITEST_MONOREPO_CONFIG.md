# Vitest Monorepo 配置说明

## 概述

本文档说明如何在 monorepo 项目中配置 Vitest，以便 IDE 插件（如 VS Code Vitest 插件）能够正确识别和运行测试。

## 配置结构

### 1. 根目录配置 (`vitest.config.ts`)

在 monorepo 根目录创建 `vitest.config.ts`，使用 `projects` 配置来支持多个子项目：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        name: 'server',
        root: './apps/server',
      },
    ],
  },
});
```

### 2. 子项目配置 (`apps/server/vitest.config.ts`)

每个子项目应该有自己的 `vitest.config.ts`，包含具体的测试配置：

```typescript
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    // ... 其他配置
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. VS Code 配置 (`.vscode/settings.json`)

为了让 VS Code Vitest 插件能够识别测试，需要配置：

```json
{
  "vitest.workspaceConfig": "./vitest.config.ts",
  "vitest.commandLine": "pnpm --filter @midscene/server test",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## 使用方法

### 运行测试

在子项目目录下运行：

```bash
cd apps/server
npm run test
```

或者在根目录运行：

```bash
pnpm --filter @midscene/server test
```

### IDE 插件使用

1. 安装 VS Code Vitest 插件
2. 重新加载 VS Code 窗口（Cmd/Ctrl + Shift + P -> "Reload Window"）
3. 插件应该能够自动识别测试文件，并在测试旁边显示运行按钮

## 故障排查

### 插件无法识别测试文件

1. **检查配置文件路径**：确保 `.vscode/settings.json` 中的 `vitest.workspaceConfig` 指向正确的配置文件
2. **检查项目结构**：确保 `vitest.config.ts` 中的 `projects` 配置指向正确的子项目路径
3. **重新加载窗口**：在 VS Code 中执行 "Reload Window" 命令
4. **检查插件设置**：在 VS Code 设置中搜索 "vitest"，确保插件已启用

### 测试无法运行

1. **检查依赖**：确保在子项目的 `package.json` 中安装了 `vitest`
2. **检查脚本**：确保 `package.json` 中有 `test` 脚本
3. **检查路径**：确保测试文件路径符合 `include` 配置的模式

## 参考

- [Vitest 官方文档 - Workspace](https://vitest.dev/guide/workspace.html)
- [VS Code Vitest 插件](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer)
