import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, isProduction } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import routes from './routes';

const app = express();

// A02: sin huella del framework y confianza solo en 1 proxy (p. ej. un balanceador).
app.disable('x-powered-by');
app.set('trust proxy', 1);

// A02 / A04: cabeceras de seguridad (CSP, HSTS, nosniff, frame-ancestors, etc.).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://accounts.google.com'],
        frameSrc: ['https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    strictTransportSecurity: isProduction,
    crossOriginEmbedderPolicy: false,
  }),
);

// A02: CORS restringido a orígenes explícitos, con credenciales (cookies).
const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Peticiones sin cabecera Origin (curl, health checks) no son de navegador.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }),
);

// A06: límite de tamaño de payload.
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api', apiLimiter);
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
