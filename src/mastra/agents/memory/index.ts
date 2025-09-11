import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';

const memory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./src/mastra/agents/memory/db/memory.db',
  }),
});

export { memory };
