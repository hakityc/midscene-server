# 使用本地魔改版 Midscene 包说明

## 概述

本项目已经配置为使用本地魔改版 midscene 包（版本 `0.30.4-lebo.1`）。所有依赖的 midscene 包都存储在 `local-packages/` 目录中，通过 pnpm overrides 机制确保使用本地版本。

## 文件结构

```
midscene-server/
├── local-packages/                    # 本地 midscene 包存储目录
│   ├── midscene-core-0.30.4-lebo.1.tgz
│   ├── midscene-mcp-0.30.4-lebo.1.tgz
│   ├── midscene-web-0.30.4-lebo.1.tgz
│   ├── midscene-shared-0.30.4.tgz
│   └── midscene-playground-0.30.4.tgz
├── package.json                       # 包含 pnpm overrides 配置
└── apps/
    └── server/
        └── package.json               # 直接引用本地 tarball 文件
```

## 更新 midscene 包的流程

当 midscene 项目有更新需要同步到 midscene-server 时，需要重新打包并更新本地包：

### 1. 在 midscene 项目中构建并打包

```bash
cd /Users/lebo/lebo/project/midscene

# 确保版本号和依赖正确
# 修改 packages/web-integration/package.json 和 packages/playground/package.json
# 将 workspace:* 替换为具体版本号

# 构建所有相关包
pnpm --filter @midscene/core build
pnpm --filter @midscene/shared build
pnpm --filter @midscene/recorder build
pnpm --filter @midscene/playground build
pnpm --filter @midscene/mcp build
pnpm --filter @midscene/web build

# 打包为 tarball
cd packages/core && pnpm pack && cp *.tgz ../../../midscene-server/local-packages/
cd ../shared && pnpm pack && cp *.tgz ../../../midscene-server/local-packages/
cd ../playground && pnpm pack && cp *.tgz ../../../midscene-server/local-packages/
cd ../mcp && pnpm pack && cp *.tgz ../../../midscene-server/local-packages/
cd ../web-integration && pnpm pack && cp *.tgz ../../../midscene-server/local-packages/
```

### 2. 在 midscene-server 项目中重新安装

```bash
cd /Users/lebo/lebo/project/midscene-server

# 清理旧的依赖
find . -name node_modules -type d | xargs rm -rf
rm -f pnpm-lock.yaml

# 重新安装
pnpm install
```

### 3. 验证安装

```bash
# 检查版本是否正确
cat apps/server/node_modules/@midscene/core/package.json | grep '"version"'
cat apps/server/node_modules/@midscene/web/package.json | grep '"version"'
cat apps/server/node_modules/@midscene/mcp/package.json | grep '"version"'

# 应该显示 0.30.4-lebo.1
```

## 关键配置说明

### 1. package.json 的 pnpm overrides

根目录的 `package.json` 中配置了 overrides，确保所有依赖都使用本地包：

```json
"pnpm": {
  "overrides": {
    "@midscene/core": "file:local-packages/midscene-core.tgz",
    "@midscene/mcp": "file:local-packages/midscene-mcp.tgz",
    "@midscene/web": "file:local-packages/midscene-web.tgz",
    "@midscene/shared": "file:local-packages/midscene-shared.tgz",
    "@midscene/playground": "file:local-packages/midscene-playground.tgz"
  }
}
```

### 2. apps/server/package.json 的直接引用

`apps/server/package.json` 中直接引用本地 tarball：

```json
"dependencies": {
  "@midscene/core": "file:../../local-packages/midscene-core.tgz",
  "@midscene/mcp": "file:../../local-packages/midscene-mcp.tgz",
  "@midscene/web": "file:../../local-packages/midscene-web.tgz"
}
```

### 3. midscene 项目中的同步命令

在 `midscene` 仓库中新增了 `scripts/sync-midscene-packages.mjs`，并在 `package.json` 中配置：

```json
"scripts": {
  "build": "nx run-many --target=build --exclude=doc --verbose",
  "postbuild": "node scripts/sync-midscene-packages.mjs",
  "sync-midscene-packages": "node scripts/sync-midscene-packages.mjs"
}
```

执行 `pnpm build` 或手动运行 `pnpm run sync-midscene-packages` 时，会自动：

- 分别对 `@midscene/core`、`@midscene/mcp`、`@midscene/web` 执行 `pnpm pack`
- 将生成的 `*.tgz` 文件复制到 `midscene-server/apps/server/local-packages/`
- 固定输出文件名为 `midscene-xxx.tgz`，避免频繁修改 `package.json`

## 注意事项

1. **不提交 node_modules**：确保 `.gitignore` 中包含 `node_modules/` 和 `local-packages/`
2. **保持脚本路径正确**：`midscene` 与 `midscene-server` 需要位于同级目录，脚本默认写死为 `../midscene-server/apps/server/local-packages`
3. **构建顺序**：仍按依赖顺序构建（shared → core → recorder/playground → web/mcp），确保 `pnpm pack` 输出内容完整
4. **验证完整性**：重新打包后务必验证所有依赖版本正确，避免缓存导致的问题

## 故障排除

如果遇到依赖版本不匹配的错误：

1. 彻底清理 node_modules 和 pnpm-lock.yaml
2. 确认所有 tarball 文件都在 local-packages 目录中
3. 验证 tarball 内的 package.json 依赖版本正确
4. 使用 `pnpm install --force` 强制重新安装

## 发布到生产环境

当前配置下，生产构建会正常处理依赖：

- tsup 构建时会将源代码复制到 `dist/server`
- 部署脚本会生成正确的 `package.json`，包含所有依赖版本
- 部署时运行 `npm install` 会使用远程依赖或保持本地文件引用

如果是通过文件引用，需要确保部署环境中 `local-packages/` 目录存在，或者改为发布到私有 npm registry。
