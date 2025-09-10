import fs from 'node:fs';
import path from 'node:path';

console.log('📦 创建生产环境 package.json...');

const prodPackage = {
  name: 'midscene-server',
  type: 'module',
  scripts: {
    start: 'node index.js',
  },
  dependencies: {
    '@ai-sdk/openai': '2.0.23',
    '@ai-sdk/openai-compatible': '1.0.13',
    '@hono/node-server': '^1.19.0',
    '@hono/node-ws': '1.2.0',
    '@midscene/web': '^0.27.6',
    dotenv: '^17.2.1',
    hono: '^4.9.5',
    zod: '^3.25.76',
  },
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
