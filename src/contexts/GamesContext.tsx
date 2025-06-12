import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Game, GameStatus } from '../types/game';
import { useAuth } from './AuthContext';
import { V1_STATUS_MAP } from '../utils/status-map';

interface GamesContextType {
  games: Game[];
  saveGame: (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, editingGame: Game | null, steamAppId?: string) => void;
  deleteGame: (id: string) => void;
  clearGames: () => void;
  importWishlist: () => Promise<void>;
  updateGameStatus: (gameId: string, newStatus: GameStatus) => void;
  stats: {
    gamesPlayed: number;
    gamesToBePlayed: number;
  };
}

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export const useGames = () => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const GamesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    if (user) {
      const storedGames = localStorage.getItem(`games-${user.id}`);
      let gamesToLoad = storedGames ? JSON.parse(storedGames) : [];

      // Migrate old statuses
      gamesToLoad = gamesToLoad.map((game: Game) => {
        if (Object.keys(V1_STATUS_MAP).includes(game.status)) {
          return { ...game, status: V1_STATUS_MAP[game.status as keyof typeof V1_STATUS_MAP] || 'backlog' };
        }
        return game;
      });

      setGames(gamesToLoad);
    } else {
      setGames([]); // No user, no games
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`games-${user.id}`, JSON.stringify(games));
    }
  }, [games, user]);

  const saveGame = useCallback((gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, editingGame: Game | null, steamAppId?: string) => {
    const now = new Date().toISOString();
    if (editingGame) {
      setGames(prev => prev.map(g => g.id === editingGame.id ? { ...editingGame, ...gameData, dateModified: now } : g));
    } else {
      const newGame: Game = {
        ...gameData,
        id: steamAppId || generateId(),
        dateAdded: now,
        dateModified: now,
      };
      setGames(prev => [...prev, newGame]);
    }
  }, []);

  const deleteGame = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      setGames(prev => prev.filter(game => game.id !== id));
    }
  }, []);

  const clearGames = useCallback(() => {
    if (window.confirm('Are you sure you want to delete ALL game data? This action cannot be undone.')) {
      setGames([]);
    }
  }, []);

  const updateGameStatus = useCallback((gameId: string, newStatus: GameStatus) => {
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, status: newStatus, dateModified: new Date().toISOString() } : g));
  }, []);
  
  const importWishlist = useCallback(async () => {
    if (!user?.steamId) {
      alert('You must be logged in with Steam to import a wishlist.');
      return;
    }

    try {
      const workerUrl = `https://game-backlog-wishlist-worker.feikovandijk.workers.dev?steamId=${user.steamId}`;
      const response = await fetch(workerUrl);

      if (!response.ok) {
        if (response.status === 403) {
          const privacySettingsUrl = 'https://steamcommunity.com/my/edit/settings';
          alert(`Could not import wishlist. This usually means your Steam profile is private.\n\nPlease ensure your "Game Details" are set to "Public" in your Steam privacy settings and try again.\n\nYou can find your settings here: ${privacySettingsUrl}`);
          window.open(privacySettingsUrl, '_blank');
          return;
        }
        throw new Error(`Failed to fetch wishlist. Status: ${response.status}`);
      }

      const newGamesFromServer = await response.json();

      if (Array.isArray(newGamesFromServer) && newGamesFromServer.length > 0) {
        const now = new Date().toISOString();
        const newGames: Game[] = newGamesFromServer.map((game: any) => ({
          id: game.id || generateId(),
          title: game.title || 'Unknown Title',
          description: game.description || '',
          platform: 'PC',
          status: 'backlog',
          ownership: 'wishlist',
          dateAdded: now,
          dateModified: now,
          rating: 0,
          playtime: 0,
          genre: game.genre || '',
          priority: false,
          notes: game.notes || '',
        }));

        setGames(prevGames => {
          const existingIds = new Set(prevGames.map(g => g.id));
          const uniqueNewGames = newGames.filter(g => !existingIds.has(g.id));
          return [...prevGames, ...uniqueNewGames];
        });

        alert(`Successfully imported ${newGames.length} games from your wishlist.`);
      } else {
        alert('No new games found on your wishlist, or the data was in an unexpected format.');
      }
    } catch (error) {
      console.error('Error importing Steam wishlist:', error);
      alert('An error occurred while importing the wishlist.');
    }
  }, [user]);

  const stats = useMemo(() => {
    const gamesPlayed = games.filter(g => g.status === 'completed').length;
    const gamesToBePlayed = games.filter(g => g.status === 'backlog').length;
    return { gamesPlayed, gamesToBePlayed };
  }, [games]);

  const value = { games, saveGame, deleteGame, clearGames, importWishlist, stats, updateGameStatus };

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}; 