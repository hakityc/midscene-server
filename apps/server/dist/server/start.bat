@echo off
chcp 65001 >nul

REM MidScene Server 启动脚本 (Windows) - 预发布环境
echo 🚀 启动 MidScene Server (预发布环境)...

REM 检查 Node.js 版本
for /f "tokens=1 delims=." %%i in ('node -v') do set node_version=%%i
set node_version=%node_version:v=%
if %node_version% LSS 18 (
    echo ❌ 错误: 需要 Node.js 18 或更高版本，当前版本:
    node -v
    pause
    exit /b 1
)

echo ✅ Node.js 版本检查通过:
node -v

REM 检查环境变量文件
if not exist ".env" (
    echo ⚠️  警告: .env 文件不存在
    if exist ".env.sample" (
        echo 📋 复制 .env.sample 到 .env
        copy ".env.sample" ".env" >nul
        echo 📝 请编辑 .env 文件配置环境变量
        echo    必需的变量: OPENAI_API_KEY, OPENAI_BASE_URL, MIDSCENE_MODEL_NAME
        echo.
        echo 按任意键继续，或 Ctrl+C 取消...
        pause >nul
    ) else (
        echo ❌ 错误: .env.sample 文件不存在
        pause
        exit /b 1
    )
)

REM 检查必要的环境变量
findstr /C:"OPENAI_API_KEY=" .env >nul
if errorlevel 1 (
    echo ⚠️  警告: OPENAI_API_KEY 未正确配置
) else (
    findstr /C:"OPENAI_API_KEY=your_" .env >nul
    if not errorlevel 1 (
        echo ⚠️  警告: OPENAI_API_KEY 未正确配置
    )
)

findstr /C:"OPENAI_BASE_URL=" .env >nul
if errorlevel 1 (
    echo ⚠️  警告: OPENAI_BASE_URL 未正确配置
) else (
    findstr /C:"OPENAI_BASE_URL=https://api.openai.com/v1" .env >nul
    if not errorlevel 1 (
        echo ⚠️  警告: OPENAI_BASE_URL 未正确配置
    )
)

findstr /C:"MIDSCENE_MODEL_NAME=" .env >nul
if errorlevel 1 (
    echo ⚠️  警告: MIDSCENE_MODEL_NAME 未正确配置
) else (
    findstr /C:"MIDSCENE_MODEL_NAME=gpt-4" .env >nul
    if not errorlevel 1 (
        echo ⚠️  警告: MIDSCENE_MODEL_NAME 未正确配置
    )
)

REM 安装依赖
echo 📦 安装依赖...
call npm install --production

if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

REM 启动服务
echo 🚀 启动服务...
echo 📍 服务将在 http://localhost:3000 启动
echo 🔍 健康检查: http://localhost:3000/health
echo.

REM 直接启动，环境变量从 .env 文件读取
node index.js
