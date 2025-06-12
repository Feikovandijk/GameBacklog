export interface User {
  id: string;
  steamId: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  error: string | null;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  displayName: string;
}

export interface SteamAuthResponse {
  steamId: string;
  displayName: string;
  avatarUrl?: string;
} 