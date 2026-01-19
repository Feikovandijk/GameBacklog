import 'express';

declare global {
  namespace Express {
    interface User {
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
  }
}
