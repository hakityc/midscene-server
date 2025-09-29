import fs from 'node:fs';
import path from 'node:path';

console.log('📦 创建预发布环境 package.json...');

// 读取原始 package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const stagingPackage = {
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

// 写入预发布环境的 package.json
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(stagingPackage, null, 2),
);

console.log('✅ 预发布环境 package.json 已创建');
