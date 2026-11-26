# FinVault · Sistema Seguro de Bóveda Financiera

Aplicación full-stack con arquitectura MVC en el backend, cifrado en reposo con
AES-256-GCM, autenticación local (bcrypt) y Google (OIDC), y una interfaz
Glassmorphism en escala de grises con un único acento azul.

## Estructura

```
finvault/
├── backend/                 Node.js 20+ · Express · Sequelize · TypeScript · PostgreSQL
│   ├── src/
│   │   ├── config/          env.ts (validación Zod), database.ts (Sequelize)
│   │   ├── models/          User (bcrypt + teléfono cifrado), Account (AES-GCM), PasswordReset (SHA-256)
│   │   ├── controllers/     authController, accountController, adminController
│   │   ├── middlewares/     authMiddleware (JWT + RBAC), rateLimiter, validate, errorHandler
│   │   ├── routes/          index.ts (/api/auth, /api/accounts, /api/admin)
│   │   ├── services/        mailer.ts (recuperación de contraseña)
│   │   ├── validators/      schemas.ts (Zod)
│   │   ├── utils/           crypto.ts, jwt.ts, logger.ts (pino), asyncHandler.ts
│   │   ├── app.ts           Express: helmet, CORS, trust proxy, límites
│   │   └── server.ts        Arranque con fail-fast
│   └── tests/               crypto.test.ts (node:test), smoke.ts
└── frontend/                React 18 · Vite · TypeScript · Tailwind · Lucide
    └── src/                 pages (AuthPage, VaultDashboard), components, api/client.ts
```

## Puesta en marcha

```bash
# 1. Backend
cd backend
npm ci
cp .env.example .env          # reemplaza TODOS los valores
npm run dev                   # http://localhost:4000

# 2. Frontend (otra terminal)
cd frontend
npm ci
npm run dev                   # http://localhost:5173 (proxy /api -> 4000)
```

Generar claves:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # DATA_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # JWT_SECRET
```

Pruebas: `cd backend && npm test`.

## Criptografía

| Uso | Mecanismo | Reversible |
|---|---|---|
| Contraseñas | bcrypt, coste 12 | No |
| Tokens de recuperación | 32 bytes `crypto.randomBytes`; en BD solo SHA-256 | No |
| IBAN, saldo, notas, teléfono | AES-256-GCM, IV de 12 bytes y Auth Tag de 16 bytes por registro | Sí (con `DATA_ENCRYPTION_KEY`) |

Formato cifrado: `base64(iv):base64(authTag):base64(ciphertext)`.
La clave se lee de `process.env` y debe tener exactamente 32 bytes en Base64.

## Controles OWASP Top 10:2025

| Riesgo | Control implementado |
|---|---|
| A01 Control de acceso | `authenticate` + `requireRole`; todas las consultas de cuentas filtran por `userId` del token (anti-IDOR, 404 uniforme) |
| A02 Misconfiguration | helmet (CSP, HSTS en producción), `x-powered-by` desactivado, `trust proxy = 1`, CORS con lista blanca |
| A03 Supply chain | `npm ci` con `package-lock.json`, dependencias mínimas, `npm audit` en CI recomendado |
| A04 Cryptographic failures | bcrypt 12, AES-256-GCM, cookie `HttpOnly`, `Secure` (producción), `SameSite=Strict` |
| A05 Injection | Sequelize parametrizado, Zod en cada entrada, React escapa la salida |
| A06 Insecure design | Límites por IP, límite de cuentas por usuario con bloqueo transaccional, tamaño de payload 10 KB |
| A07 Authentication failures | 5 intentos / 15 min por IP+correo en login, política de contraseñas, respuestas genéricas, dummy bcrypt anti-enumeración, JWT de 15 min |
| A08 Integrity | JWT con algoritmo fijo HS256 e issuer; ID tokens de Google verificados por firma, audiencia y `email_verified` |
| A09 Logging | pino en JSON con censura automática; eventos de login fallido, cambios de rol y accesos denegados |
| A10 Exceptional conditions | Handler global; al cliente solo `Error interno en el servidor` |

## Decisiones y pendientes

- **Esquema:** en desarrollo `sequelize.sync()`; en producción usar migraciones (p. ej. `sequelize-cli`).
- **Correo:** sin `SMTP_URL` la recuperación de contraseña registra el fallo sin el token. Configura SMTP para enviar el enlace.
- **Revocación de sesiones:** los JWT son stateless (15 min). Un cambio de contraseña no invalida sesiones activas antes de su expiración; un `tokenVersion` en el usuario cerraría esa ventana.
- **Rol en el token:** el rol viaja en el JWT; un cambio de rol surte efecto al renovar la sesión.
- **Base de datos:** PostgreSQL. Para MySQL cambiar `dialect` y los tipos ENUM/UUID.
- **Producción:** servir detrás de HTTPS, configurar `CORS_ORIGIN` y `FRONTEND_URL` reales y ejecutar `npm audit`.
