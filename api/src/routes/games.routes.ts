import { Router } from 'express';
import * as gamesController from '../controllers/games.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/most-reviewed', asyncHandler(gamesController.getMostReviewed));
router.get('/search', asyncHandler(gamesController.searchGames));
router.get('/popular-tags', asyncHandler(gamesController.getPopularTags));
router.get('/trending', asyncHandler(gamesController.getTrendingGames));
router.get(
  '/latest-with-achievements',
  asyncHandler(gamesController.getLatestGamesWithAchievements)
);
router.get(
  '/latest-synced',
  asyncHandler(gamesController.getLatestSyncedGames)
);
router.get('/latest-steam', asyncHandler(gamesController.getLatestSteamGames));

export default router;
