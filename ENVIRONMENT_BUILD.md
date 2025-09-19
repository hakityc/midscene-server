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
- 环境变量：`NODE_ENV=staging`
- 用于测试和预发布验证
- 默认构建环境

### 生产环境 (prod)
- 环境变量：`NODE_ENV=prod`
- 用于正式生产部署
- 需要明确指定构建

## 构建产物

构建完成后，会在 `dist/server/` 目录下生成：

- `package.json` - 对应环境的包配置
- `start.sh` - Linux/Mac 启动脚本
- `start.bat` - Windows 启动脚本
- 其他部署文件

## 脚本文件

### 包配置脚本
- `scripts/create-prod-package.js` - 创建生产环境包配置（支持环境参数）
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
```

## 注意事项

1. 预发布环境是默认构建环境，直接运行 `npm run build` 会构建预发布环境
2. 生产环境构建需要明确使用 `npm run build:prod`
3. 启动脚本会根据环境显示相应的标识信息
4. 环境变量 `NODE_ENV` 会在运行时正确设置
