import React, { useState, useEffect } from 'react';
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
  { id: 'currently_playing', label: 'Playing' },
  { id: 'analysis_needed', label: 'Analysis' },
  { id: 'completed', label: 'Completed' },
  { id: 'on_hold', label: 'On Hold' },
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
  const [adding, setAdding] = useState<{ [key: number]: boolean }>({});
  const [added, setAdded] = useState<{ [key: number]: boolean }>({});
  const [alreadyIn, setAlreadyIn] = useState<{ [key: number]: boolean }>({});
  const [selectedStatus, setSelectedStatus] =
    useState<GameStatus>('want_to_play');

  useEffect(() => {
    const fetchSearchResults = async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.gamesAPI.searchGames(q, 20);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Error searching games catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleAddGame = async (game: Game) => {
    setAdding(prev => ({ ...prev, [game.steam_appid]: true }));
    try {
      await api.userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: selectedStatus,
      });
      setAdded(prev => ({ ...prev, [game.steam_appid]: true }));
      onGameAdded();
    } catch (error: unknown) {
      // 409 = already in library
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 409
      ) {
        setAlreadyIn(prev => ({ ...prev, [game.steam_appid]: true }));
      } else {
        console.error('Error adding game:', error);
      }
    } finally {
      setAdding(prev => ({ ...prev, [game.steam_appid]: false }));
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStatus('want_to_play');
    setAdded({});
    setAlreadyIn({});
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
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-primary/10 rounded-xl'>
              <span className='material-symbols-outlined text-primary text-[20px]'>
                add_circle
              </span>
            </div>
            <h2 className='text-xl font-bold text-white'>Add Game to Board</h2>
          </div>
          <button
            onClick={handleClose}
            className='text-text-secondary hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5'
          >
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 max-h-[70vh] overflow-y-auto'>
          {/* Target column selector */}
          <div className='mb-5'>
            <label className='block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2'>
              Add to Column
            </label>
            <div className='flex flex-wrap gap-2'>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 text-sm ${
                    selectedStatus === status.id
                      ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                      : 'bg-background-dark text-text-secondary hover:bg-white/5 border border-white/10'
                  }`}
                >
                  <StatusBadge
                    status={status.id}
                    minimal
                    className='w-2 h-2'
                  />
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className='relative mb-5'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              {loading ? (
                <div className='w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin' />
              ) : (
                <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                  search
                </span>
              )}
            </div>
            <input
              type='text'
              className='block w-full pl-10 pr-3 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'
              placeholder='Search Steam catalog…'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Results */}
          <div className='space-y-2'>
            {searchResults.map(game => {
              const isAdded = added[game.steam_appid];
              const isAlreadyIn = alreadyIn[game.steam_appid];
              const isAdding = adding[game.steam_appid];

              return (
                <div
                  key={game.steam_appid}
                  className='flex items-center gap-4 p-3 bg-background-dark/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors'
                >
                  <div className='w-16 h-10 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-white/5'>
                    <img
                      src={
                        game.header_image ||
                        `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`
                      }
                      alt={game.name}
                      className='w-full h-full object-cover'
                      loading='lazy'
                    />
                  </div>

                  <div className='flex-1 min-w-0'>
                    <h3 className='text-white font-semibold text-sm truncate'>
                      {game.name}
                    </h3>
                    <div className='flex items-center gap-2 mt-0.5'>
                      {game.genres?.slice(0, 2).map(genre => (
                        <span
                          key={genre}
                          className='text-[10px] text-text-secondary bg-white/5 px-1.5 py-0.5 rounded'
                        >
                          {genre}
                        </span>
                      ))}
                      {game.positive_rating_percentage > 0 && (
                        <span className='text-[10px] text-text-secondary'>
                          {game.positive_rating_percentage}% positive
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdded ? (
                    <span className='flex items-center gap-1.5 text-accent-green text-sm font-medium px-3'>
                      <span className='material-symbols-outlined text-[16px]'>
                        check_circle
                      </span>
                      Added
                    </span>
                  ) : isAlreadyIn ? (
                    <span className='flex items-center gap-1.5 text-text-secondary text-sm px-3'>
                      <span className='material-symbols-outlined text-[16px]'>
                        info
                      </span>
                      In library
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddGame(game)}
                      disabled={isAdding}
                      className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 whitespace-nowrap text-sm flex items-center gap-1.5'
                    >
                      {isAdding ? (
                        <>
                          <span className='w-3.5 h-3.5 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin' />
                          Adding…
                        </>
                      ) : (
                        <>
                          <span className='material-symbols-outlined text-[16px]'>
                            add
                          </span>
                          Add
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {searchResults.length === 0 &&
              searchQuery.trim() &&
              !loading && (
                <div className='text-center py-12 text-text-secondary'>
                  <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                    search_off
                  </span>
                  <p>No games found in the Steam catalog.</p>
                </div>
              )}

            {!searchQuery.trim() && (
              <div className='text-center py-12 text-text-secondary'>
                <span className='material-symbols-outlined text-4xl mb-2 opacity-50'>
                  sports_esports
                </span>
                <p className='text-sm'>Search the Steam catalog to add a game</p>
                <p className='text-xs mt-1 opacity-60'>
                  Games already in your library will be marked
                </p>
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToBoardModal;
