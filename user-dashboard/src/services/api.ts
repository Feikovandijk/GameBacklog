import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
});

export interface User {
  $id: string;
  steam_id: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  real_name?: string;
  country_code?: string;
  is_public_profile: boolean;
  auto_import_steam_games: boolean;
  sync_steam_playtime: boolean;
  default_game_status: string;
  theme: string;
  default_view: string;
  created_at: string;
  last_steam_sync?: string;
  last_active?: string;
}

export interface Game {
  $id: string;
  steam_appid: number;
  name: string;
  short_description: string;
  header_image: string;
  release_date: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  total_reviews: number;
  positive_rating_percentage: number;
  tags: string[];
  price_final: number;
  price_currency: string;
  current_players?: number;
}

export interface UserGame {
  $id: string;
  user_id: string;
  game_id: string;
  steam_appid: number;
  status:
    | 'want_to_play'
    | 'currently_playing'
    | 'completed'
    | 'completed_100'
    | 'on_hold'
    | 'dropped';
  priority: number;
  user_rating?: number;
  user_notes: string;
  user_tags: string[];
  hours_played: number;
  playtime_2weeks?: number;
  completion_percentage: number;
  is_favorite: boolean;
  added_at: string;
  updated_at: string;
  completed_at?: string;
  last_played?: string;
  game?: Game;
}

export interface UserStats {
  totalGames: number;
  completedGames: number;
  currentlyPlaying: number;
  wantToPlay: number;
  onHold: number;
  dropped: number;
  completionPercentage: number;
}

export interface ExtendedUserStats {
  totalHoursPlayed: number;
}

export interface DashboardStats {
  totalGames: number;
  completedGames: number;
  completed100: number;
  currentlyPlaying: number;
  wantToPlay: number;
  onHold: number;
  dropped: number;
  completedThisWeek: number;
  completedThisMonth: number;
  completedThisYear: number;
  totalHoursPlayed: number;
  avgHoursPerCompletion: number;
  topGenres: { name: string; count: number }[];
  recentAchievementCount: number;
  collectionValueEstimate: number;
  completionPercentage: number;
}

export interface Achievement {
  $id: string;
  api_name: string;
  display_name: string;
  description: string;
  icon: string;
  icon_gray: string;
  hidden: boolean;
  game_id: string;
}

export interface RecentAchievement {
  $id: string;
  user_id: string;
  achievement_id: string;
  steam_appid: number;
  is_unlocked: boolean;
  unlock_time: string;
  achievement: Achievement;
  game: Game;
}

export interface UserActivity {
  $id: string;
  user_id: string;
  type: string;
  timestamp: string;
  metadata_json: string;
}

// Authentication
export const authAPI = {
  getCurrentUser: () => api.get<User>('/auth/me'),
  login: () => {
    window.location.href = `${API_BASE_URL}/auth/steam`;
  },
  logout: () => api.post('/auth/logout'),
};

// User Games
export const userGamesAPI = {
  get: (params?: {
    status?: string;
    priority?: number;
    limit?: number;
    offset?: number;
    search?: string;
  }) =>
    api.get<{ documents: UserGame[]; total: number }>('/api/user/games', {
      params,
    }),

  addGame: (gameData: {
    steam_appid: number;
    status: string;
    priority?: number;
    user_notes?: string;
    user_tags?: string[];
  }) => api.post<UserGame>('/api/user/games', gameData),

  updateGame: (gameId: string, updateData: Partial<UserGame>) =>
    api.put<UserGame>(`/api/user/games/${gameId}`, updateData),

  removeGame: (gameId: string) => api.delete(`/api/user/games/${gameId}`),

  getStats: () => api.get<UserStats>('/api/user/stats'),

  getExtendedStats: () =>
    api.get<ExtendedUserStats>('/api/user/stats/extended'),

  getDashboardStats: () => api.get<DashboardStats>('/api/user/stats/dashboard'),

  getRecentAchievements: () =>
    api.get<RecentAchievement[]>('/api/user/achievements/recent'),

  getActivity: () => api.get<UserActivity[]>('/api/user/activity'),

  getRecentlyPlayed: (limit = 5) =>
    api.get<UserGame[]>(`/api/user/games/recently-played?limit=${limit}`),
};

// Public Games (for search)
export const gamesAPI = {
  searchGames: (query: string, limit = 20) =>
    api.get<Game[]>('/api/games/search', { params: { q: query, limit } }),
  getTrendingGames: (limit = 10, days?: number) =>
    api.get<Game[]>('/api/games/trending', { params: { limit, days } }),
};

export const getActivity = () => userGamesAPI.getActivity();
export const searchGames = gamesAPI.searchGames;
export const getUserGames = userGamesAPI.get;
export const updateUserGame = userGamesAPI.updateGame;
export const removeUserGame = userGamesAPI.removeGame;

export default api;
