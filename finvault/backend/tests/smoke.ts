process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DATABASE_URL = 'postgres://u:p@127.0.0.1:1/none';
process.env.LOG_LEVEL = 'fatal';


const main = async () => {
  const app = (await import('../src/app')).default;
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}/api`;
  const post = (path: string, body: unknown) =>
    fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: JSON.stringify(body) });

  const weak = await post('/auth/register', { email: 'a@b.com', password: 'corta', role: 'admin' });
  console.log('register weak ->', weak.status, await weak.text());

  const acc = await fetch(base + '/accounts', { headers: { origin: 'http://localhost:5173' } });
  console.log('accounts sin sesión ->', acc.status);

  const headers = await fetch(`http://127.0.0.1:${port}/api/auth/me`);
  console.log('x-powered-by presente? ->', headers.headers.get('x-powered-by'), '| helmet csp ->', Boolean(headers.headers.get('content-security-policy')));

  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const r = await post('/auth/login', { email: 'nadie@finvault.test', password: 'Clave-Incorrecta-1!' });
    statuses.push(r.status);
  }
  console.log('login x7 ->', statuses.join(','));
  server.close();
};
main();
