import { Request, Response } from 'express';
import { env } from '../config/env';
import { sequelize } from '../config/database';
import { Account, User } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import type { z } from 'zod';
import type {
  createAccountSchema,
  updateAccountSchema,
} from '../validators/schemas';

type CreateAccountInput = z.infer<typeof createAccountSchema>;
type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/**
 * Todas las consultas incluyen `userId = req.user.id`. Una cuenta ajena devuelve
 * el mismo 404 que una inexistente: no se revela su existencia (anti IDOR, A01).
 */

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await Account.findAll({
    where: { userId: req.user!.id },
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: accounts.map((account) => account.toSafeJSON()) });
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { alias, iban, balance, notes } = req.body as CreateAccountInput;

  // A06: límite de negocio comprobado dentro de una transacción con bloqueo
  // sobre la fila del usuario, para evitar que dos peticiones simultáneas lo superen.
  const result = await sequelize.transaction(async (transaction) => {
    await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });

    const total = await Account.count({ where: { userId }, transaction });
    if (total >= env.MAX_ACCOUNTS_PER_USER) {
      return { ok: false as const };
    }

    const account = await Account.create(
      { userId, alias, iban, balance, notes: notes ?? null },
      { transaction },
    );
    return { ok: true as const, account };
  });

  if (!result.ok) {
    res.status(422).json({ success: false, message: 'Límite de cuentas alcanzado' });
    return;
  }

  logger.info({ event: 'account_created', userId, accountId: result.account.id }, 'account_created');
  res.status(201).json({ success: true, data: result.account.toSafeJSON() });
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await Account.findOne({ where: { id: req.params.id, userId: req.user!.id } });
  if (!account) {
    res.status(404).json({ success: false, message: 'Cuenta no encontrada' });
    return;
  }
  res.json({ success: true, data: account.toSafeJSON() });
});

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const { alias, balance, notes } = req.body as UpdateAccountInput;

  const account = await Account.findOne({ where: { id: req.params.id, userId: req.user!.id } });
  if (!account) {
    res.status(404).json({ success: false, message: 'Cuenta no encontrada' });
    return;
  }

  if (alias !== undefined) account.alias = alias;
  if (balance !== undefined) account.balance = balance;
  if (notes !== undefined) account.notes = notes;
  await account.save();

  logger.info({ event: 'account_updated', userId: req.user!.id, accountId: account.id }, 'account_updated');
  res.json({ success: true, data: account.toSafeJSON() });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Account.destroy({ where: { id: req.params.id, userId: req.user!.id } });
  if (deleted === 0) {
    res.status(404).json({ success: false, message: 'Cuenta no encontrada' });
    return;
  }
  logger.info({ event: 'account_deleted', userId: req.user!.id, accountId: req.params.id }, 'account_deleted');
  res.json({ success: true, message: 'Cuenta eliminada' });
});
