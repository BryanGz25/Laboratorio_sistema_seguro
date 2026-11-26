const B = 'http://localhost:5176/api';
const cookieJar = {};
const call = async (method, path, body) => {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ') },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc) { const [pair] = sc.split(';'); const [k, ...v] = pair.split('='); cookieJar[k] = v.join('='); }
  return { status: res.status, data: await res.json().catch(() => null) };
};
console.log('register', await call('POST', '/auth/register', { email: 'demo@finvault.test', password: 'Demo-Segura-2026!' }));
console.log('login', (await call('POST', '/auth/login', { email: 'demo@finvault.test', password: 'Demo-Segura-2026!' })).status);
console.log('create', await call('POST', '/accounts', { alias: 'Nómina principal', iban: 'ES91 2100 0418 4502 0005 1332', balance: '1500.50', notes: 'Cuenta de sueldo' }));
console.log('list', JSON.stringify((await call('GET', '/accounts')).data));
