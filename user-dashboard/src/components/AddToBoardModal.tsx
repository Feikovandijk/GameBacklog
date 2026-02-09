import React, { useState } from 'react';
import * as api from '../services/api';
import type { Game } from '../services/api';
import StatusBadge, { type GameStatus } from './shared/StatusBadge';

interface AddToBoardModalProps {
  open: boolean;
  onCancel: () => void;
  onGameAdded: () => void;
}

const STATUS_OPTIONS: { id: GameStatus; label: string }[] = [
  { id: 'want_to_play', label: 'Backlog' },
  { id: 'currently_playing', label: 'In Progress' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
];

const AddToBoardModal: React.FC<AddToBoardModalProps> = ({
  open,
  onCancel,
  onGameAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<{ [key: string]: boolean }>({});
  const [selectedStatus, setSelectedStatus] = useState<GameStatus>('want_to_play');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.gamesAPI.searchGames(searchQuery, 10);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: Game) => {
    setAdding(prev => ({ ...prev, [game.id]: true }));
    try {
      await api.userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: selectedStatus,
      });
      onGameAdded();
      setSearchResults(prev => prev.filter(g => g.id !== game.id));
    } catch (error) {
      console.error('Error adding game:', error);
    } finally {
      setAdding(prev => ({ ...prev, [game.id]: false }));
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStatus('want_to_play');
    onCancel();
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
      <div
        className='bg-surface-dark border border-border-dark rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in-up'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/5'>
          <h2 className='text-xl font-bold text-white'>Add Game to Board</h2>
          <button
            onClick={handleClose}
            className='text-text-secondary hover:text-white transition-colors'
          >
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 max-h-[70vh] overflow-y-auto'>
          {/* Status Selector */}
          <div className='mb-6'>
            <label className='block text-sm font-medium text-text-secondary mb-3'>
              Add to Column
            </label>
            <div className='flex flex-wrap gap-2'>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    selectedStatus === status.id
                      ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                      : 'bg-background-dark text-text-secondary hover:bg-white/5 border border-white/10'
                  }`}
                >
                  <StatusBadge status={status.id} minimal className='w-2.5 h-2.5' />
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className='flex gap-3 mb-6'>
            <div className='relative flex-1'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                  search
                </span>
              </div>
              <input
                type='text'
                className='block w-full pl-10 pr-3 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'
                placeholder='Search for games...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type='submit'
              disabled={loading}
              className='px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10'
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results */}
          <div className='space-y-3'>
            {searchResults.map(game => (
              <div
                key={game.id}
                className='flex items-center gap-4 p-4 bg-background-dark/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors'
              >
                <div className='w-20 h-20 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-white/5'>
                  <img
                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                    alt={game.name}
                    className='w-full h-full object-cover'
                    loading='lazy'
                  />
                </div>

                <div className='flex-1 min-w-0'>
                  <h3 className='text-white font-semibold truncate mb-1'>
                    {game.name}
                  </h3>
                  <p className='text-text-secondary text-sm truncate'>
                    {game.developers?.join(', ')}
                  </p>
                  {game.genres && game.genres.length > 0 && (
                    <p className='text-text-secondary text-xs mt-1'>
                      {game.genres.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleAddGame(game)}
                  disabled={adding[game.id]}
                  className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 whitespace-nowrap'
                >
                  {adding[game.id] ? (
                    <span className='flex items-center gap-2'>
                      <span className='w-4 h-4 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin' />
                      Adding...
                    </span>
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            ))}

            {!loading && searchResults.length === 0 && searchQuery && (
              <div className='text-center py-12 text-text-secondary'>
                <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                  search_off
                </span>
                <p>No games found. Try a different search term.</p>
              </div>
            )}

            {!searchQuery && (
              <div className='text-center py-12 text-text-secondary'>
                <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                  search
                </span>
                <p>Search for a game to add to your board</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-white/5 bg-background-dark/50 flex justify-end'>
          <button
            onClick={handleClose}
            className='px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToBoardModal;
