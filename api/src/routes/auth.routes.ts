import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

import { rateLimit } from '../middleware/rate-limit';
const router = Router();

// Apply rate limiting (20 requests per hour for auth)
router.use(rateLimit(60 * 60 * 1000, 20));

router.get(
  '/steam',
  authController.login as unknown as import('express').RequestHandler
);
router.get('/steam/return', ...authController.returnAuth);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

export default router;
