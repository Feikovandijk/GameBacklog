import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

import { rateLimit } from '../middleware/rate-limit';
const router = Router();

// Rate limit login initiation only (10 per 15 minutes)
const loginRateLimit = rateLimit(15 * 60 * 1000, 10);

router.get(
  '/steam',
  loginRateLimit,
  authController.login as unknown as import('express').RequestHandler
);
router.get('/steam/return', ...authController.returnAuth);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

export default router;
