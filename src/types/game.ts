export type GameStatus = 'backlog' | 'playing' | 'completed' | 'dropped' | 'wishlist';

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
  rating: number;
  playtime: number;
  genre: string;
  priority: boolean;
  notes: string;
  achievements?: {
    unlocked: number;
    total: number;
    percent: number;
    lastUnlocked?: string;
  };
}

export const GAME_STATUSES: GameStatus[] = [
  'backlog',
  'playing',
  'completed',
  'dropped',
  'wishlist'
];

export const OWNERSHIP_STATUSES: OwnershipStatus[] = [
  'owned',
  'wishlist',
  'borrowed'
];