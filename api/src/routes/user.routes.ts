import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit';

const router = Router();

// Rate limiting: disabled in development, 100 req / 15 min in production
if (process.env.NODE_ENV === 'production') {
  router.use(rateLimit(15 * 60 * 1000, 100));
}

// Apply auth middleware to all routes in this router
router.use(requireAuth);

// Sync triggers background process, returns void synchronously
router.post('/sync', userController.syncUser);
router.get('/games', asyncHandler(userController.getUserGames));
router.get(
  '/games/recently-played',
  asyncHandler(userController.getRecentlyPlayed)
);
router.post('/games', asyncHandler(userController.addUserGame));
router.delete('/games/bulk', asyncHandler(userController.bulkDeleteByStatus));
router.put('/games/:id', asyncHandler(userController.updateUserGame));
router.delete('/games/:id', asyncHandler(userController.deleteUserGame));

router.get('/stats', asyncHandler(userController.getUserStats));
router.get('/stats/extended', asyncHandler(userController.getExtendedStats));
router.get('/stats/dashboard', asyncHandler(userController.getDashboardStats));

router.get(
  '/achievements/recent',
  asyncHandler(userController.getRecentAchievements)
);
router.get('/activity', asyncHandler(userController.getUserActivity));

router.put('/profile', asyncHandler(userController.updateUserProfile));

export default router;
