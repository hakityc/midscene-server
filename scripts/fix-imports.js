import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 修复 ES 模块导入路径...');

const distDir = 'dist';

// 需要修复的文件和导入映射
const _importFixes = [
  {
    file: 'index.js',
    fixes: [
      { from: "from './server';", to: "from './server/index.js';" }
    ]
  }
];

// 递归处理目录中的所有 .js 文件
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 修复所有相对路径导入，添加 .js 扩展名
  const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]*?)['"];?/g;
  content = content.replace(relativeImportRegex, (match, importPath) => {
    // 如果导入路径没有扩展名，添加 .js
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      // 计算相对于当前文件的绝对路径
      const currentDir = path.dirname(filePath);
      const fullPath = path.resolve(currentDir, importPath);

      // 检查是否存在对应的目录，如果存在则添加 /index.js
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        modified = true;
        return match.replace(importPath, `${importPath}/index.js`);
      }
      // 检查是否存在对应的 .js 文件
      else if (fs.existsSync(`${fullPath}.js`)) {
        modified = true;
        return match.replace(importPath, `${importPath}.js`);
      }
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ 修复了 ${filePath}`);
  }
}

// 处理 dist 目录
if (fs.existsSync(distDir)) {
  processDirectory(distDir);
  console.log('✅ ES 模块导入路径修复完成');
} else {
  console.log('❌ dist 目录不存在');
}
