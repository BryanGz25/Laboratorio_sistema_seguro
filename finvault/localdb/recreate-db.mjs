import pg from '../backend/node_modules/pg/lib/index.js';
const admin = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'finvault', password: 'finvault_local_pw', database: 'postgres' });
await admin.connect();
await admin.query('DROP DATABASE IF EXISTS finvault WITH (FORCE)');
await admin.query("CREATE DATABASE finvault OWNER finvault ENCODING 'UTF8' TEMPLATE template0");
const r = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname='finvault'");
console.log('finvault encoding:', r.rows[0].enc);
await admin.end();
