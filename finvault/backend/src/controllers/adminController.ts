import { Request, Response } from 'express';
import { User } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import type { z } from 'zod';
import type { updateRoleSchema } from '../validators/schemas';

type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ success: true, data: users.map((user) => user.toSafeJSON()) });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const targetId = String(req.params.id);
  const { role } = req.body as UpdateRoleInput;

  if (targetId === actorId) {
    res.status(400).json({ success: false, message: 'No puedes modificar tu propio rol' });
    return;
  }

  const user = await User.findByPk(targetId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return;
  }

  const previousRole = user.role;
  user.role = role;
  await user.save();

  // A09: los cambios de rol siempre quedan auditados.
  logger.warn(
    { event: 'role_changed', actorId, targetUserId: targetId, previousRole, newRole: role },
    'role_changed',
  );
  res.json({ success: true, data: user.toSafeJSON() });
});
