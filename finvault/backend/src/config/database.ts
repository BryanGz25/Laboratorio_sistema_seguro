import { Sequelize } from 'sequelize';
import { env, isProduction } from './env';

/**
 * Modo SSL de la conexión a PostgreSQL (variable DATABASE_SSL):
 *  - (sin definir) -> producción: SSL con verificación estricta del certificado.
 *  - "no-verify"   -> SSL cifrado sin validar el certificado (red privada de Render).
 *  - "disable"     -> sin SSL.
 */
const sslMode = process.env.DATABASE_SSL;

const buildDialectOptions = () => {
  if (sslMode === 'disable') return {};
  if (sslMode === 'no-verify') return { ssl: { require: true, rejectUnauthorized: false } };
  return isProduction ? { ssl: { require: true, rejectUnauthorized: true } } : {};
};

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
  dialectOptions: buildDialectOptions(),
  define: {
    underscored: false,
    timestamps: true,
  },
});
