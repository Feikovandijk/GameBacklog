import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { doubleCsrfProtection } from '../middleware/csrf';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(requireAuth);

router.post('/sync', userController.syncUser);
router.get('/games', userController.getUserGames);
router.get('/games/recently-played', userController.getRecentlyPlayed);
router.post('/games', doubleCsrfProtection, userController.addUserGame);
router.put('/games/:id', doubleCsrfProtection, userController.updateUserGame);
router.delete(
  '/games/:id',
  doubleCsrfProtection,
  userController.deleteUserGame
);

router.get('/stats', userController.getUserStats);
router.get('/stats/extended', userController.getExtendedStats);
router.get('/stats/dashboard', userController.getDashboardStats);

router.get('/achievements/recent', userController.getRecentAchievements);
router.get('/activity', userController.getUserActivity);

export default router;
