export interface Requirements {
    minimum: string;
    recommended: string;
}

export interface ReviewSummary {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
}

export interface Webm {
    '480': string;
    max: string;
}

export interface GameDocument {
  steam_appid: number;
  name: string;
  short_description?: string | null;
  detailed_description?: string | null;
  about_the_game?: string | null;
  header_image?: string | null;
  website?: string | null;
  screenshots?: string[] | null;
  movies?: string[] | null;
  release_date?: string | null;
  last_updated: string;
  developers?: string[] | null;
  publishers?: string[] | null;
  is_early_access?: boolean | null;
  is_free?: boolean | null;
  total_reviews?: number | null;
  steam_app_type?: string | null;
  price_final?: number | null;
  price_currency?: string | null;
  price_initial?: number | null;
  discount_percent?: number | null;
  total_positive?: number | null;
  total_negative?: number | null;
  review_score_desc?: string | null;
  current_players?: number | null;
  tags?: string[] | null;
  genres?: string[] | null;
  controller_support?: string | null;
  metacritic_score?: number | null;
  metacritic_url?: string | null;
  platforms_windows?: boolean | null;
  platforms_mac?: boolean | null;
  platforms_linux?: boolean | null;
  pc_requirements?: string | Requirements | null;
  mac_requirements?: string | Requirements | null;
  linux_requirements?: string | Requirements | null;
  supported_languages?: string | null;
  dlc?: number[] | null;
  required_age?: number | null;
  categories?: string[] | null;
  has_steam_achievements?: boolean | null;
  positive_rating_percentage?: number | null;
}

export interface WebApiData {
  type: string;
  name: string;
  steam_appid: number;
  short_description?: string;
  required_age?: number;
  is_free?: boolean;
  dlc?: number[];
  detailed_description?: string;
  about_the_game?: string;
  supported_languages?: string;
  header_image: string;
  website?: string;
  pc_requirements?: string | Requirements;
  mac_requirements?: string | Requirements;
  linux_requirements?: string | Requirements;
  developers: string[];
  publishers: string[];
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  metacritic?: { score: number; url: string };
  categories?: { id: number; description: string }[];
  genres?: { id: string; description: string }[];
  screenshots?: { id: number; path_thumbnail: string; path_full: string }[];
  movies?: {
    id: number;
    name: string;
    thumbnail: string;
    webm: Webm;
    mp4: { 480: string; max: string };
  }[];
  release_date: { coming_soon: boolean; date: string };
  review_summary?: ReviewSummary;
  player_count?: number;
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  achievements?: { total: number };
}

export interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  img_logo_url: string;
}

export interface PlayerAchievement {
  apiname: string;
  achieved: number; // 1 for unlocked, 0 for locked
  unlocktime: number; // Unix timestamp
}

export interface GameStats {
  name: string;
  value: number;
}

export interface Achievement {
  name: string; // This is the API name
  displayName: string;
  description: string;
  hidden: boolean;
  icon: string;
  icongray: string;
  percent?: number; // from the global stats endpoint
}

export interface AchievementDocument {
  game_id: string; // FK to games collection document $id
  steam_appid: number;
  api_name: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  icon_gray?: string | null;
  hidden?: boolean | null;
  global_percentage?: number | null;
}

export interface User {
  id: string;
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
