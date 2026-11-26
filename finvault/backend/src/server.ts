import app from './app';
import { sequelize } from './config/database';
import { env, isProduction } from './config/env';
import './models';
import { assertEncryptionKey } from './utils/crypto';
import { logger } from './utils/logger';

const start = async (): Promise<void> => {
  // Fail-fast: si falta la clave de cifrado, el servidor no arranca.
  assertEncryptionKey();
  await sequelize.authenticate();

  if (isProduction) {
    // En producción el esquema se gestiona con migraciones, nunca con sync().
    logger.info({ event: 'startup' }, 'database_connected');
  } else {
    await sequelize.sync();
    logger.info({ event: 'startup' }, 'database_synced_dev');
  }

  app.listen(env.PORT, () => {
    logger.info({ event: 'startup', port: env.PORT }, 'server_started');
  });
};

start().catch((error: unknown) => {
  // Solo el tipo de error: sin valores de configuración ni credenciales.
  const name = error instanceof Error ? error.name : 'UnknownError';
  logger.fatal({ event: 'startup_failed', errorName: name }, 'startup_failed');
  process.exit(1);
});
