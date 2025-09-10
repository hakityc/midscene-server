import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';

const memory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./db/memory.db',
  }),
});

export { memory };
