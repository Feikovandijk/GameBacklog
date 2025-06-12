import { useState, useEffect } from 'react';
import { Game } from '../types/game';
import { useLocalStorage } from './useLocalStorage';
import { useAuth } from '../contexts/AuthContext';

export const useGames = () => {
  const { user } = useAuth();
  const storageKey = user ? `games_${user.id}` : 'games_guest';
  const [games, setGames] = useLocalStorage<Game[]>(storageKey, []);

  // Clear games when user logs out
  useEffect(() => {
    if (!user) {
      setGames([]);
    }
  }, [user, setGames]);

  const addGame = (game: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>) => {
    const now = new Date().toISOString();
    const newGame: Game = {
      ...game,
      id: Math.random().toString(36).substr(2, 9),
      dateAdded: now,
      dateModified: now,
    };
    setGames(prev => [...prev, newGame]);
  };

  const updateGame = (id: string, updates: Partial<Game>) => {
    setGames(prev =>
      prev.map(game =>
        game.id === id
          ? { ...game, ...updates, dateModified: new Date().toISOString() }
          : game
      )
    );
  };

  const deleteGame = (id: string) => {
    setGames(prev => prev.filter(game => game.id !== id));
  };

  const clearGames = () => {
    setGames([]);
  };

  return {
    games,
    addGame,
    updateGame,
    deleteGame,
    clearGames,
  };
}; 