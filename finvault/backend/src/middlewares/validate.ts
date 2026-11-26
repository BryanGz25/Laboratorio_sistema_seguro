import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

type Source = 'body' | 'params';

/**
 * A05 Injection: valida y tipa la entrada con Zod. Zod descarta las claves no
 * declaradas (evita mass assignment, p. ej. enviar "role" en el registro).
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues: ZodError['issues'] = result.error.issues;
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      req.params = result.data as Request['params'];
    }
    next();
  };
