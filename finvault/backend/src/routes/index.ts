import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as authController from '../controllers/authController';
import * as accountController from '../controllers/accountController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { forgotPasswordLimiter, loginLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import {
  createAccountSchema,
  forgotPasswordSchema,
  googleLoginSchema,
  idParamSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateAccountSchema,
  updateRoleSchema,
} from '../validators/schemas';

const router = Router();

/* ---------- Autenticación (/api/auth) ---------- */
const authRouter = Router();
authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/google', validate(googleLoginSchema), authController.googleLogin);
authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
authRouter.get('/me', authenticate, authController.me);
router.use('/auth', authRouter);

/* ---------- Cuentas bancarias del usuario (/api/accounts) ---------- */
const accountRouter = Router();
accountRouter.use(authenticate);
accountRouter.get('/', accountController.listAccounts);
accountRouter.post('/', validate(createAccountSchema), accountController.createAccount);
accountRouter.get('/:id', validate(idParamSchema, 'params'), accountController.getAccount);
accountRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateAccountSchema),
  accountController.updateAccount,
);
accountRouter.delete('/:id', validate(idParamSchema, 'params'), accountController.deleteAccount);
router.use('/accounts', accountRouter);

/* ---------- Administración (solo rol admin) ---------- */
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/users', adminController.listUsers);
adminRouter.patch(
  '/users/:id/role',
  validate(idParamSchema, 'params'),
  validate(updateRoleSchema),
  adminController.updateUserRole,
);
router.use('/admin', adminRouter);

export default router;
