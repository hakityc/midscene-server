# 环境构建说明

本项目现在支持两套环境构建：生产环境 (prod) 和预发布环境 (staging)。

## 构建命令

### 预发布环境构建（默认）
```bash
npm run build
# 或者
npm run build:staging
```

### 生产环境构建
```bash
npm run build:prod
```

## 环境区别

### 预发布环境 (staging)
- 环境变量：`NODE_ENV=staging`（在 .env 文件中设置）
- 用于测试和预发布验证
- 默认构建环境

### 生产环境 (prod)
- 环境变量：`NODE_ENV=prod`（在 .env 文件中设置）
- 用于正式生产部署
- 需要明确指定构建

## 构建产物

构建完成后，会在 `dist/server/` 目录下生成：

- `package.json` - 简化的包配置（启动命令为 `node index.js`）
- `.env` - 环境变量文件（根据构建环境自动设置 NODE_ENV）
- `start.sh` - Linux/Mac 启动脚本
- `start.bat` - Windows 启动脚本
- 其他部署文件

## 脚本文件

### 环境配置脚本
- `scripts/create-prod-env.js` - 创建生产环境 .env 文件
- `scripts/create-staging-env.js` - 创建预发布环境 .env 文件

### 包配置脚本
- `scripts/create-prod-package.js` - 创建生产环境包配置
- `scripts/create-staging-package.js` - 创建预发布环境包配置

### 启动脚本
- `scripts/create-start-script.js` - 创建启动脚本（支持环境参数）
- `scripts/create-staging-start-script.js` - 创建预发布环境启动脚本

## 使用示例

```bash
# 构建预发布环境
npm run build:staging

# 构建生产环境
npm run build:prod

# 运行预发布环境
cd dist/server
./start.sh  # Linux/Mac
# 或
start.bat   # Windows

# 或者直接运行
node index.js
```

## 环境变量配置

- 构建脚本会自动复制项目根目录的 `.env` 文件
- 并根据构建环境自动修改其中的 `NODE_ENV` 值
- 生产环境：`NODE_ENV=prod`
- 预发布环境：`NODE_ENV=staging`

## 注意事项

1. 预发布环境是默认构建环境，直接运行 `npm run build` 会构建预发布环境
2. 生产环境构建需要明确使用 `npm run build:prod`
3. 启动脚本会根据环境显示相应的标识信息
4. 环境变量通过 `.env` 文件设置，不再使用命令行参数
5. 确保项目根目录存在 `.env` 文件，构建脚本会基于此文件生成环境特定的配置
