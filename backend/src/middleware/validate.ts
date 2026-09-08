import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestLocation = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as unknown as Record<string, unknown>)[location] = schema.parse(
        (req as unknown as Record<string, unknown>)[location]
      );
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        res.status(400).json({ message: 'Validation error', errors });
        return;
      }
      res.status(400).json({ message: 'Invalid request' });
    }
  };
}
