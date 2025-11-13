import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6543';

const axiosInstance = axios.create({
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

// Notes and Templates
export interface GameNote {
  $id: string;
  user_id: string;
  game_id?: string; // Optional - notes can be standalone or linked to games
  title: string;
  content: string;
  color?: string; // For Google Keep-like colored notes
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  game?: Game; // Populated when linked to a game
}

export interface NoteTemplate {
  $id: string;
  name: string;
  category: 'ui_ux' | 'narrative' | 'gameplay' | 'monetization' | 'technical' | 'general';
  description: string;
  fields: TemplateField[];
  is_default: boolean;
  created_at: string;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'rating' | 'multiselect' | 'checkbox' | 'number';
  required: boolean;
  options?: string[]; // for multiselect/checkbox
  placeholder?: string;
  max_length?: number;
}

export interface StructuredNote {
  $id: string;
  user_id: string;
  game_id: string;
  template_id: string;
  title: string;
  analysis_data: Record<string, any>; // Dynamic data based on template
  insights: string; // Free-form insights summary
  created_at: string;
  updated_at: string;
  template?: NoteTemplate;
  game?: Game;
}

// Authentication
export const authAPI = {
  getCurrentUser: () => axiosInstance.get<User>('/auth/me'),
  login: () => {
    window.location.href = `${API_BASE_URL}/auth/steam`;
  },
  logout: () => axiosInstance.post('/auth/logout'),
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
    axiosInstance.get<{ documents: UserGame[]; total: number }>('/api/user/games', {
      params,
    }),

  addGame: (gameData: {
    steam_appid: number;
    status: string;
    priority?: number;
    user_notes?: string;
    user_tags?: string[];
  }) => axiosInstance.post<UserGame>('/api/user/games', gameData),

  updateGame: (gameId: string, updateData: Partial<UserGame>) =>
    axiosInstance.put<UserGame>(`/api/user/games/${gameId}`, updateData),

  removeGame: (gameId: string) => axiosInstance.delete(`/api/user/games/${gameId}`),

  getStats: () => axiosInstance.get<UserStats>('/api/user/stats'),

  getExtendedStats: () =>
    axiosInstance.get<ExtendedUserStats>('/api/user/stats/extended'),

  getRecentAchievements: () =>
    axiosInstance.get<RecentAchievement[]>('/api/user/achievements/recent'),

  getActivity: () => axiosInstance.get<UserActivity[]>('/api/user/activity'),

  getRecentlyPlayed: (limit = 5) =>
    axiosInstance.get<UserGame[]>(`/api/user/games/recently-played?limit=${limit}`),

  getWishlist: () => axiosInstance.get<any[]>('/api/user/wishlist'),

  addGameToBacklog: (steamAppId: string, status: string) =>
    axiosInstance.post('/api/user/games', { steam_appid: steamAppId, status }),

  syncUserGames: () => axiosInstance.post('/api/user/sync'),
};

// Public Games (for search)
export const gamesAPI = {
  searchGames: (query: string, limit = 20) =>
    axiosInstance.get<Game[]>('/api/games/search', { params: { q: query, limit } }),
};

// Notes
export const notesAPI = {
  // Get all notes for the current user
  getNotes: (params?: {
    game_id?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }) =>
    axiosInstance.get<{ documents: GameNote[]; total: number }>('/api/user/notes', {
      params,
    }),

  // Create a new note
  createNote: (noteData: {
    title: string;
    content: string;
    game_id?: string;
    color?: string;
    tags?: string[];
    is_pinned?: boolean;
  }) => axiosInstance.post<GameNote>('/api/user/notes', noteData),

  // Update an existing note
  updateNote: (noteId: string, updateData: Partial<GameNote>) =>
    axiosInstance.put<GameNote>(`/api/user/notes/${noteId}`, updateData),

  // Delete a note
  deleteNote: (noteId: string) => axiosInstance.delete(`/api/user/notes/${noteId}`),

  // Get note templates
  getTemplates: () => axiosInstance.get<NoteTemplate[]>('/api/note-templates'),

  // Create structured analysis note
  createStructuredNote: (noteData: {
    game_id: string;
    template_id: string;
    title: string;
    analysis_data: Record<string, any>;
    insights: string;
  }) => axiosInstance.post<StructuredNote>('/api/user/structured-notes', noteData),

  // Get structured notes
  getStructuredNotes: (params?: {
    game_id?: string;
    template_id?: string;
    limit?: number;
    offset?: number;
  }) =>
    axiosInstance.get<{ documents: StructuredNote[]; total: number }>('/api/user/structured-notes', {
      params,
    }),
};

export const api = {
  ...authAPI,
  ...userGamesAPI,
  ...gamesAPI,
  ...notesAPI,
};

export const getActivity = () => userGamesAPI.getActivity();
export const searchGames = gamesAPI.searchGames;
export const getUserGames = userGamesAPI.get;
export const updateUserGame = userGamesAPI.updateGame;
export const removeUserGame = userGamesAPI.removeGame;

