export interface Game {
  id: string;
  title: string;
  platform: string;
  genre: string;
  status: GameStatus;
  ownership: OwnershipStatus;
  priority: boolean;
  notes: string;
  dateAdded: string;
  dateModified: string;
}

export type GameStatus = 
  | 'Unplayed'
  | 'Unfinished' 
  | 'Beaten'
  | 'Completed'
  | 'Endless'
  | 'None';

export type OwnershipStatus =
  | 'Physical'
  | 'Digital'
  | 'Subscription'
  | 'Borrowed'
  | 'Wishlist';

export const GAME_STATUSES: GameStatus[] = [
  'Unplayed',
  'Unfinished',
  'Beaten', 
  'Completed',
  'Endless',
  'None'
];

export const OWNERSHIP_STATUSES: OwnershipStatus[] = [
  'Physical',
  'Digital',
  'Subscription', 
  'Borrowed',
  'Wishlist'
];