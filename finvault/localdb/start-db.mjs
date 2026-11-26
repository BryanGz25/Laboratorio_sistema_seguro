import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const dataDir = new URL('./data', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'finvault',
  password: 'finvault_local_pw',
  port: 5432,
  persistent: true,
});

if (!fs.existsSync(dataDir)) await pg.initialise();
await pg.start();
try { await pg.createDatabase('finvault'); } catch { /* already exists */ }
console.log('POSTGRES_READY on 5432');
setInterval(() => {}, 1 << 30);
