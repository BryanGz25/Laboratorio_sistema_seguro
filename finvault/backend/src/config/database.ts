import { Sequelize } from 'sequelize';
import { env, isProduction } from './env';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
  dialectOptions: isProduction
    ? { ssl: { require: true, rejectUnauthorized: true } }
    : {},
  define: {
    underscored: false,
    timestamps: true,
  },
});
