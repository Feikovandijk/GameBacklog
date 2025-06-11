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
  | 'Inbox'
  | 'To Play'
  | 'Playing'
  | 'Done'
  | 'Discarded';

export type OwnershipStatus =
  | 'Physical'
  | 'Digital'
  | 'Subscription'
  | 'Borrowed'
  | 'Wishlist';

export const GAME_STATUSES: GameStatus[] = [
  'Inbox',
  'To Play',
  'Playing',
  'Done',
  'Discarded'
];

export const OWNERSHIP_STATUSES: OwnershipStatus[] = [
  'Physical',
  'Digital',
  'Subscription', 
  'Borrowed',
  'Wishlist'
];