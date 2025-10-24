import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 创建生产环境 .env 文件...');

// 确保 dist/server 目录存在
const distDir = 'dist/server';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 读取现有的 .env 文件
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ 错误: .env 文件不存在，请先创建 .env 文件');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// 修改 NODE_ENV 为 prod
envContent = envContent.replace(/NODE_ENV=.*/, 'NODE_ENV=prod');

// 写入生产环境的 .env 文件
fs.writeFileSync(path.join(distDir, '.env'), envContent);

console.log('✅ 生产环境 .env 文件已创建');
