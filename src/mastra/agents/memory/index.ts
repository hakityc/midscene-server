import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const envUrl = process.env.MEMORY_DB_URL;

let dbUrl: string;
if (envUrl) {
  dbUrl = envUrl;
} else {
  const dbPath = join(process.cwd(), 'data', 'memory.db');
  mkdirSync(dirname(dbPath), { recursive: true });
  dbUrl = `file:${dbPath}`;
}

const memory = new Memory({
  storage: new LibSQLStore({
    url: dbUrl,
  }),
});

export { memory };
