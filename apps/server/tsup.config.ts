import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

// 自动修复 ES 模块导入路径，添加 .js 扩展名
const fixImports = () => {
  const outDir = 'dist/server';
  
  console.log('🔧 修复 ES 模块导入路径...');
  
  // 递归处理所有 .js 文件
  const processDirectory = (dir: string) => {
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
  };

  const processFile = (filePath: string) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 匹配相对路径导入：from "./xxx" 或 from "../xxx"
    const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]*?)['"];?/g;
    
    content = content.replace(relativeImportRegex, (match, importPath) => {
      // 如果已经有扩展名，跳过
      if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
        return match;
      }

      // 计算相对于当前文件的绝对路径
      const currentDir = path.dirname(filePath);
      const fullPath = path.resolve(currentDir, importPath);

      // 检查是否是目录（需要添加 /index.js）
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        modified = true;
        return match.replace(importPath, `${importPath}/index.js`);
      }
      // 检查是否存在对应的 .js 文件
      else if (fs.existsSync(`${fullPath}.js`)) {
        modified = true;
        return match.replace(importPath, `${importPath}.js`);
      }

      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  };

  // 处理整个输出目录
  if (fs.existsSync(outDir)) {
    processDirectory(outDir);
    console.log('✅ ES 模块导入路径修复完成');
  } else {
    console.log('❌ dist/server 目录不存在');
  }
};

export default defineConfig((options) => {
  const isProduction = process.env.NODE_ENV === 'prod';

  return {
    // 使用 glob 模式匹配所有 TypeScript 文件（保持目录结构）
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/__tests__/**', '!src/test/**'],
    
    // 输出目录
    outDir: 'dist/server',
    
    // 输出格式：ESM
    format: ['esm'],
    
    // 每次构建前清理输出目录
    clean: true,
    
    // 生成 sourcemap（便于调试）
    sourcemap: !isProduction,
    
    // 不打包，保持原始文件结构
    bundle: false,
    
    // 代码分割（保持模块结构）
    splitting: false,
    
    // 目标平台
    platform: 'node',
    
    // Node.js 版本
    target: 'node18',
    
    // TypeScript 配置
    tsconfig: './tsconfig.json',
    
    // 不生成 .d.ts 文件
    dts: false,
    
    // 监听模式（开发时使用）
    watch: options.watch,
    
    // 不进行 tree-shaking（保持原始代码结构）
    treeshake: false,
    
    // 环境变量
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    
    // 不压缩代码（便于调试和日志追踪）
    minify: false,
    
    // 输出时保持原始目录结构
    outExtension: () => ({ js: '.js' }),
    
    // 保留原始导入
    skipNodeModulesBundle: true,
    
    // 静默不必要的警告
    silent: false,
    
    // 构建成功后自动修复导入路径
    async onSuccess() {
      fixImports();
    },
  };
});

