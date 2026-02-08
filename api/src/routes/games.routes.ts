import { Router } from 'express';
import * as gamesController from '../controllers/games.controller';

const router = Router();

router.get('/most-reviewed', gamesController.getMostReviewed);
router.get('/search', gamesController.searchGames);
router.get('/popular-tags', gamesController.getPopularTags);
router.get('/trending', gamesController.getTrendingGames);
router.get(
  '/latest-with-achievements',
  gamesController.getLatestGamesWithAchievements
);
router.get('/latest-synced', gamesController.getLatestSyncedGames);
router.get('/latest-steam', gamesController.getLatestSteamGames);

export default router;
