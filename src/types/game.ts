export type GameStatus = 'backlog' | 'playing' | 'beaten' | 'completed' | 'endless' | 'dropped';

export type OwnershipStatus = 'owned' | 'wishlist' | 'borrowed';

export interface Game {
  id: string;
  title: string;
  description: string;
  platform: string;
  status: GameStatus;
  ownership: OwnershipStatus;
  dateAdded: string;
  dateModified: string;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  rating: number;
  playtime: number;
  playtimeGoal?: number;
  playtime2Weeks?: number;
  genre: string;
  priority: boolean;
  notes: string;
  imageUrl?: string;
  achievements?: {
    unlocked: number;
    total: number;
  };
}

export const GAME_STATUSES: GameStatus[] = [
  'backlog',
  'playing',
  'beaten',
  'completed',
  'endless',
  'dropped',
];

export const OWNERSHIP_STATUSES: OwnershipStatus[] = [
  'owned',
  'wishlist',
  'borrowed'
];