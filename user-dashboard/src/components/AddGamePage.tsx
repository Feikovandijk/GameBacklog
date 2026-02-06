import React, { useState } from 'react';
import * as api from '../services/api';
import type { Game } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AddGamePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [adding, setAdding] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.gamesAPI.searchGames(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching games:', error);
      // alert('Failed to search for games.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: Game) => {
    setAdding(prev => ({ ...prev, [game.id]: true }));
    try {
      await api.userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: 'want_to_play', // Default status
      });
      navigate('/games');
    } catch (error) {
      console.error('Error adding game:', error);
      // alert(`Failed to add ${game.name}. It might already be in your backlog.`);
    } finally {
      setAdding(prev => ({ ...prev, [game.id]: false }));
    }
  };

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='bg-surface-dark border border-border-dark rounded-2xl p-6 md:p-8 shadow-xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-white mb-2'>Add Game</h1>
          <p className='text-text-secondary'>
            Search for games to add to your backlog.
          </p>
        </div>

        <form onSubmit={handleSearch} className='flex gap-4 mb-8'>
          <div className='relative flex-1'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <span className='material-symbols-outlined text-text-secondary'>
                search
              </span>
            </div>
            <input
              type='text'
              className='block w-full pl-10 pr-3 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-lg transition-colors'
              placeholder='e.g. Cyberpunk 2077'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type='submit'
            disabled={loading}
            className='px-8 py-3 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20'
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className='space-y-4'>
          {searchResults.map(game => (
            <div
              key={game.id}
              className='flex flex-col sm:flex-row items-center gap-4 p-4 bg-background-dark/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors'
            >
              <div className='w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-white/5'>
                <img
                  src={game.header_image}
                  alt={game.name}
                  className='w-full h-full object-cover'
                />
              </div>

              <div className='flex-1 text-center sm:text-left min-w-0'>
                <a
                  href={`https://store.steampowered.com/app/${game.steam_appid}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-lg font-bold text-white hover:text-primary transition-colors truncate block'
                >
                  {game.name}
                </a>
                <p className='text-text-secondary text-sm truncate'>
                  {game.developers?.join(', ')}
                </p>
              </div>

              <button
                onClick={() => handleAddGame(game)}
                disabled={adding[game.id]}
                className='w-full sm:w-auto px-6 py-2.5 bg-surface-hover hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
              >
                {adding[game.id] ? (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin' />
                    Adding...
                  </span>
                ) : (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='material-symbols-outlined text-[20px]'>
                      add_circle
                    </span>
                    Add to Backlog
                  </span>
                )}
              </button>
            </div>
          ))}

          {!loading && searchResults.length === 0 && searchQuery && (
            <div className='text-center py-12 text-text-secondary'>
              No games found. Try a different search term.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddGamePage;
