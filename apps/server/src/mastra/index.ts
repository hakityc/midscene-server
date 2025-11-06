import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  CloudExporter,
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter,
} from '@mastra/core/ai-tracing';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { documentSummaryAgent } from './agents/modules/document-summary-agent';

// 使用与 memory/index.ts 一致的路径
const dbPath = join(process.cwd(), 'data', 'mastra-memory.db');
mkdirSync(dirname(dbPath), { recursive: true });
const dbUrl = `file:${dbPath}`;

export const mastra = new Mastra({
  agents: { documentSummaryAgent },
  observability: {
    configs: {
      default: {
        serviceName: 'mastra',
        sampling: { type: SamplingStrategyType.ALWAYS },
        processors: [new SensitiveDataFilter()],
        exporters: [new CloudExporter(), new DefaultExporter()],
      },
    },
  },
  storage: new LibSQLStore({
    url: dbUrl, // 本地 sqlite 文件
  }),
  server: {
    port: 4111,
    host: '127.0.0.1',
  },
});
