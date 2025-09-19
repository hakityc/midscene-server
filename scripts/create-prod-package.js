import fs from 'node:fs';
import path from 'node:path';

// 获取环境参数，默认为 prod
const environment = process.argv[2] || 'prod';
const isProd = environment === 'prod';

console.log(`📦 创建${isProd ? '生产' : '预发布'}环境 package.json...`);

// 读取原始 package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const packageConfig = {
  name: 'midscene-server',
  type: 'module',
  scripts: {
    start: 'node index.js',
  },
  dependencies: originalPackage.dependencies,
};

// 确保 dist/server 目录存在
const distDir = 'dist/server';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 写入环境的 package.json
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageConfig, null, 2),
);

console.log(`✅ ${isProd ? '生产' : '预发布'}环境 package.json 已创建`);
