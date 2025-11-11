import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const sourceDir = path.join(cwd, 'local-packages');
const targetDir = path.join(cwd, 'dist', 'server', 'local-packages');

if (!fs.existsSync(sourceDir)) {
  console.warn('⚠️ 未找到 local-packages 目录，跳过复制。');
  process.exit(0);
}

if (!fs.existsSync(path.join(cwd, 'dist', 'server'))) {
  console.error('❌ dist/server 目录不存在，请先执行编译步骤。');
  process.exit(1);
}

const copyDirectory = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

fs.rmSync(targetDir, { recursive: true, force: true });
copyDirectory(sourceDir, targetDir);

console.log('✅ local-packages 已复制到 dist/server/local-packages');

