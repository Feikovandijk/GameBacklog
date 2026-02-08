import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.get('/steam', authController.login);
router.get('/steam/return', ...authController.returnAuth);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

export default router;
