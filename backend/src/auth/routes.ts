import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  setup2FA,
  verify2FA,
  getSessions,
  logout,
  logoutAll,
} from './controllers';
import { authenticate } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting on sensitive auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/verify', verifyEmail);
router.post('/forgot-password', authRateLimiter, requestPasswordReset);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected routes
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/verify', authenticate, verify2FA);
router.get('/sessions', authenticate, getSessions);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

export default router;
