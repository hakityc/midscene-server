import fs from 'node:fs';
import path from 'node:path';

console.log('📦 创建生产环境 package.json...');

// 读取原始 package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const prodPackage = {
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

// 写入生产环境的 package.json
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(prodPackage, null, 2),
);

console.log('✅ 生产环境 package.json 已创建');
