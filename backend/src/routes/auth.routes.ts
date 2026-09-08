import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authenticateRefresh } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  register,
  login,
  refresh,
  logout,
  me,
  registerSchema,
  loginSchema,
} from '../controllers/auth.controller';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authenticateRefresh, refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
