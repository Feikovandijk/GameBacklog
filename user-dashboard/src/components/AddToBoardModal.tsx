import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { UserGame } from '../services/api';
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
  const [searchResults, setSearchResults] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState<{ [key: string]: boolean }>({});
  const [selectedStatus, setSelectedStatus] =
    useState<GameStatus>('currently_playing');

  useEffect(() => {
    const fetchSearchResults = async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.getUserGames({ search: q, limit: 20 });
        setSearchResults(response.data.documents);
      } catch (error) {
        console.error('Error searching user library:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const filteredGames = searchResults.filter(
    g => g.status !== selectedStatus
  );

  const handleMoveGame = async (game: UserGame) => {
    setMoving(prev => ({ ...prev, [game.id]: true }));
    try {
      await api.userGamesAPI.updateGame(game.id, { status: selectedStatus });
      onGameAdded();
    } catch (error) {
      console.error('Error moving game:', error);
    } finally {
      setMoving(prev => ({ ...prev, [game.id]: false }));
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStatus('currently_playing');
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
          <h2 className='text-xl font-bold text-white'>Move Game</h2>
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
              Move to Column
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
                  <StatusBadge
                    status={status.id}
                    minimal
                    className='w-2.5 h-2.5'
                  />
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className='relative mb-6'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              {loading ? (
                <div className='w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin ml-1' />
              ) : (
                <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                  search
                </span>
              )}
            </div>
            <input
              type='text'
              className='block w-full pl-10 pr-3 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'
              placeholder='Search your games...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Results */}
          <div className='space-y-2'>
            {filteredGames.map(game => (
              <div
                key={game.id}
                className='flex items-center gap-4 p-3 bg-background-dark/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors'
              >
                <div className='w-16 h-10 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-white/5'>
                  <img
                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                    alt={game.game?.name}
                    className='w-full h-full object-cover'
                    loading='lazy'
                  />
                </div>

                <div className='flex-1 min-w-0'>
                  <h3 className='text-white font-semibold text-sm truncate'>
                    {game.game?.name || 'Unknown Game'}
                  </h3>
                  <div className='flex items-center gap-2 mt-0.5'>
                    <StatusBadge status={game.status} />
                    {game.hours_played > 0 && (
                      <span className='text-text-secondary text-xs'>
                        {game.hours_played.toFixed(1)}h played
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMoveGame(game)}
                  disabled={moving[game.id]}
                  className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 whitespace-nowrap text-sm'
                >
                  {moving[game.id] ? (
                    <span className='flex items-center gap-2'>
                      <span className='w-4 h-4 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin' />
                      Moving...
                    </span>
                  ) : (
                    'Move'
                  )}
                </button>
              </div>
            ))}

            {filteredGames.length === 0 && searchQuery.trim() && !loading && (
              <div className='text-center py-12 text-text-secondary'>
                <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                  search_off
                </span>
                <p>No matching games in your library.</p>
              </div>
            )}

            {!searchQuery.trim() && (
              <div className='text-center py-12 text-text-secondary'>
                <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                  search
                </span>
                <p>Search your library to move a game</p>
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
