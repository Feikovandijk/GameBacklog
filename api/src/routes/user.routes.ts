import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { doubleCsrfProtection } from '../middleware/csrf';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(requireAuth);

// Sync triggers background process, returns void synchronously
router.post('/sync', userController.syncUser);
router.get('/games', asyncHandler(userController.getUserGames));
router.get(
  '/games/recently-played',
  asyncHandler(userController.getRecentlyPlayed)
);
router.post(
  '/games',
  doubleCsrfProtection,
  asyncHandler(userController.addUserGame)
);
router.put(
  '/games/:id',
  doubleCsrfProtection,
  asyncHandler(userController.updateUserGame)
);
router.delete(
  '/games/:id',
  doubleCsrfProtection,
  asyncHandler(userController.deleteUserGame)
);

router.get('/stats', asyncHandler(userController.getUserStats));
router.get('/stats/extended', asyncHandler(userController.getExtendedStats));
router.get('/stats/dashboard', asyncHandler(userController.getDashboardStats));

router.get(
  '/achievements/recent',
  asyncHandler(userController.getRecentAchievements)
);
router.get('/activity', asyncHandler(userController.getUserActivity));

export default router;
