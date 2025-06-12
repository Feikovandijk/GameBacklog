import { GameStatus } from '../types/game';

export const V1_STATUS_MAP: { [key: string]: GameStatus } = {
  Inbox: 'backlog',
  'To Play': 'backlog',
  Playing: 'playing',
  Done: 'completed',
  Discarded: 'dropped',
  Wishlist: 'wishlist',
}; 