# 从私有源获取 Midscene 包方案

## 问题分析

### 当前状态

- midscene-server 现在使用**本地 tarball 文件**（`file:local-packages/xxx.tgz`）
- 原因是之前尝试发布到私有源时遇到认证/配置问题，临时改用了本地文件方案

### 目标方案

- 使用**私有 npm registry**（Nexus）
- midscene 项目发布包到私有源
- midscene-server 从私有源自动获取最新包

## 发布到私有源的步骤

### 1. 配置 Nexus 发布地址

在 midscene 项目中，需要区分**读取**和**发布**地址：

- **读取地址（registry）**：`http://192.168.8.246:8088/nexus/content/groups/lebo_npm_all/`
  - 这是组合仓库，用于读取（安装包）
  
- **发布地址（publishConfig）**：`http://192.168.8.246:8088/nexus/content/repositories/npm-lebo/`
  - 这是具体仓库，用于发布（上传包）
  - ⚠️ 需要确认实际的 hosted repository 名称，可能不是 `npm-lebo`

### 2. 配置 midscene 项目的 .npmrc

```ini
# 默认 registry（用于读取）
registry=http://192.168.8.246:8088/nexus/content/groups/lebo_npm_all/

# 认证配置
email=lebo_npm@lebo.cn
always-auth=true
//192.168.8.246:8088/nexus/content/groups/lebo_npm_all/:_auth=YWRtaW46YWRtaW4xMjM=
//192.168.8.246:8088/nexus/content/repositories/:_auth=YWRtaW46YWRtaW4xMjM=
```

### 3. 配置每个包的 publishConfig

在每个包的 `package.json` 中设置发布地址：

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "http://192.168.8.246:8088/nexus/content/repositories/npm-lebo/"
  }
}
```

⚠️ **重要**：需要向 Nexus 管理员确认正确的 hosted repository 名称。

### 4. 发布包到私有源

```bash
cd /Users/lebo/lebo/project/midscene

# 确保已经构建
pnpm build

# 发布到私有源
pnpm --filter @midscene/core publish --no-git-checks
pnpm --filter @midscene/mcp publish --no-git-checks
pnpm --filter @midscene/web publish --no-git-checks
```

### 5. 配置 midscene-server 从私有源读取

#### 修改 midscene-server/.npmrc

```ini
registry=http://192.168.8.246:8088/nexus/content/groups/lebo_npm_all/

# 认证配置
email=lebo_npm@lebo.cn
always-auth=true
//192.168.8.246:8088/nexus/content/groups/lebo_npm_all/:_auth=YWRtaW46YWRtaW4xMjM=
```

#### 修改 midscene-server/package.json

移除 overrides，改为版本号：

```json
{
  "pnpm": {
    // 移除 overrides，改为直接使用版本号
  }
}
```

#### 修改 apps/server/package.json

```json
{
  "dependencies": {
    "@midscene/core": "0.30.4-lebo.1",
    "@midscene/mcp": "0.30.4-lebo.1",
    "@midscene/web": "0.30.4-lebo.1"
  }
}
```

## 工作流程

### 更新 midscene 包后同步到 midscene-server

1. **在 midscene 项目中修改代码**

2. **构建并发布**：

```bash
cd /Users/lebo/lebo/project/midscene

# 构建
pnpm build

# 更新版本号（如需要）
# 修改 packages/core/package.json, packages/mcp/package.json, packages/web-integration/package.json

# 发布到私有源
pnpm --filter @midscene/core publish --no-git-checks
pnpm --filter @midscene/mcp publish --no-git-checks  
pnpm --filter @midscene/web publish --no-git-checks
```

3. **在 midscene-server 中更新**：

```bash
cd /Users/lebo/lebo/project/midscene-server

# 更新依赖版本号（如需要）
# 修改 apps/server/package.json

# 重新安装
pnpm install
```

## 常见问题

### Q: `pnpm run build` 会自动更新 midscene-server 吗？

**A: 不会。** `pnpm run build` 只构建代码，不会：

- 自动打包 tarball
- 自动发布到私有源
- 自动更新 midscene-server 的依赖

需要手动执行发布流程。

### Q: 为什么现在用本地包？

**A:** 之前尝试发布到私有源时遇到了认证/配置问题（400 Bad Request），临时使用了本地 tarball 方案。现在应该：

1. 确认正确的 Nexus repository 配置
2. 完成发布流程
3. 切换 midscene-server 到私有源方案

### Q: 如何确认 Nexus repository 名称？

需要联系 Nexus 管理员确认：

- 用于发布的 hosted repository 名称
- 是否有写权限
- 认证方式是否正确

### Q: 本地包方案 vs 私有源方案？

- **本地包方案**：需要手动同步，适合临时开发
- **私有源方案**：自动同步，适合生产环境，需要正确的 Nexus 配置

## 下一步行动

1. ✅ 确认 Nexus hosted repository 的正确名称和地址
2. ✅ 完成包发布到私有源
3. ✅ 修改 midscene-server 配置从私有源读取
4. ✅ 验证自动更新流程













