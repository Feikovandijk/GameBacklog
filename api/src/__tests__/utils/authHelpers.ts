/**
 * Test utilities for authentication tests
 */

import { Request } from 'express';
import { User } from '../../types/steam.types';

/**
 * Create a mock Steam profile for testing
 */
export function mockSteamProfile() {
  return {
    _json: {
      steamid: '76561198000000001',
      personaname: 'TestUser',
      profileurl: 'https://steamcommunity.com/id/testuser/',
      avatarfull: 'https://avatars.steamstatic.com/test_full.jpg',
      avatarmedium: 'https://avatars.steamstatic.com/test_medium.jpg',
      avatar: 'https://avatars.steamstatic.com/test.jpg',
      realname: 'Test User Real Name',
      loccountrycode: 'US',
      communityvisibilitystate: 3, // Public profile
    },
    displayName: 'TestUser',
  };
}

/**
 * Create a mock user object for testing
 */
export function mockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id-123',
    steam_id: '76561198000000001',
    display_name: 'TestUser',
    avatar_url: 'https://avatars.steamstatic.com/test_full.jpg',
    profile_url: 'https://steamcommunity.com/id/testuser/',
    real_name: 'Test User Real Name',
    country_code: 'US',
    is_public_profile: true,
    auto_import_steam_games: true,
    sync_steam_playtime: true,
    default_game_status: 'want_to_play',
    theme: 'dark',
    default_view: 'grid',
    created_at: '2024-01-01T00:00:00.000Z',
    last_active: '2024-01-15T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(user: User): any {
  return {
    id: 'test-request-id',
    user: user,
    isAuthenticated: function (this: any) {
      return true;
    },
    sessionID: 'test-session-id',
    session: {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: 86400000,
        expires: new Date(Date.now() + 86400000),
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      },
    },
    path: '/test',
    method: 'GET',
    headers: {
      'x-request-id': 'test-request-id',
    },
  };
}

/**
 * Create a mock unauthenticated request
 */
export function createUnauthenticatedRequest(): any {
  return {
    id: 'test-request-id',
    user: undefined,
    isAuthenticated: function (this: any) {
      return false;
    },
    sessionID: undefined,
    path: '/test',
    method: 'GET',
    headers: {
      'x-request-id': 'test-request-id',
    },
  };
}

/**
 * Create a mock response object for testing
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock next function for middleware testing
 */
export function createMockNext() {
  return jest.fn();
}
