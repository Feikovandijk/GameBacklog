import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gamesAPI, userGamesAPI } from '../services/api';
import type { User, Game } from '../services/api';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await gamesAPI.searchGames(value, 5);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleAddGame = async (game: Game) => {
    try {
      await userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: 'want_to_play',
        priority: 1,
      });
      alert(`${game.name} added to backlog!`); // Temporary alert
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding game:', error);
      alert('Failed to add game.');
    }
  };

  return (
    <div className='bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex overflow-x-hidden'>
      {/* Sidebar */}
      <aside className='fixed left-0 top-0 h-screen w-64 bg-surface-dark border-r border-border-dark flex flex-col z-50 hidden md:flex'>
        <div className='h-20 flex items-center gap-3 px-6 border-b border-border-dark/50'>
          <div className='size-8 flex items-center justify-center bg-primary rounded-lg text-background-dark shadow-lg shadow-primary/30'>
            <span className='material-symbols-outlined text-[20px] font-bold'>
              code
            </span>
          </div>
          <h2 className='text-white text-lg font-bold leading-tight tracking-[-0.015em]'>
            DevTracker
          </h2>
        </div>

        <nav className='flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2'>
          <a
            href='#'
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/dashboard')
              ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
          >
            <span className='material-symbols-outlined font-bold'>
              dashboard
            </span>
            <span className='font-bold text-sm'>Dashboard</span>
          </a>
          <a
            href='#'
            onClick={() => navigate('/games')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive('/games')
              ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
          >
            <span
              className={`material-symbols-outlined transition-transform ${!isActive('/games') ? 'group-hover:scale-110' : ''
                }`}
            >
              library_books
            </span>
            <span className='font-medium text-sm'>Library</span>
          </a>
          {/* Board / Kanban */}
          <a
            href='#'
            onClick={() => navigate('/board')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive('/board')
              ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
          >
            <span
              className={`material-symbols-outlined transition-transform ${!isActive('/board') ? 'group-hover:scale-110' : ''
                }`}
            >
              view_kanban
            </span>
            <span className='font-medium text-sm'>Board</span>
          </a>
          <a
            href='#'
            onClick={() => navigate('/trends')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive('/trends')
              ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
          >
            <span
              className={`material-symbols-outlined transition-transform ${!isActive('/trends') ? 'group-hover:scale-110' : ''
                }`}
            >
              trending_up
            </span>
            <span className='font-medium text-sm'>Trends</span>
          </a>
          <a
            href='#'
            onClick={() => navigate('/analysis')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive('/analysis')
              ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-surface-hover'
              }`}
          >
            <span
              className={`material-symbols-outlined transition-transform ${!isActive('/analysis') ? 'group-hover:scale-110' : ''
                }`}
            >
              analytics
            </span>
            <span className='font-medium text-sm'>Analysis</span>
          </a>
        </nav>

        <div className='p-4 border-t border-border-dark/50'>
          <button
            onClick={() => navigate('/profile')}
            className='flex items-center gap-3 w-full p-2 hover:bg-surface-hover rounded-xl transition-colors text-left'
          >
            <div
              className='bg-center bg-no-repeat bg-cover rounded-full size-9 border border-border-dark'
              style={{ backgroundImage: `url("${user.avatar_url}")` }}
            ></div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-bold text-white truncate'>
                {user.display_name}
              </p>
            </div>
            <span className='material-symbols-outlined text-text-secondary text-[20px]'>
              settings
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex-1 md:ml-64 flex flex-col min-h-screen'>
        {/* Header */}
        <header className='flex items-center justify-between px-6 py-4 md:px-8 border-b border-border-dark bg-background-dark/50 backdrop-blur-md sticky top-0 z-40'>
          <button className='md:hidden text-white mr-4'>
            <span className='material-symbols-outlined'>menu</span>
          </button>

          <div className='flex-1 max-w-xl relative'>
            <label className='flex flex-col w-full !h-10'>
              <div className='flex w-full flex-1 items-stretch rounded-lg h-full border border-border-dark focus-within:border-primary transition-colors bg-surface-dark/50 overflow-visible z-50'>
                <div className='text-text-secondary flex items-center justify-center pl-3 pr-2'>
                  <span className='material-symbols-outlined text-[20px]'>
                    search
                  </span>
                </div>
                <input
                  className='flex w-full min-w-0 flex-1 resize-none bg-transparent text-white focus:outline-none placeholder:text-text-secondary px-2 text-sm font-normal leading-normal'
                  placeholder='Search games to add...'
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </label>

            {/* Search Results Dropdown */}
            {(isSearching || searchResults.length > 0) && (
              <div className='absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-border-dark rounded-xl shadow-xl overflow-hidden z-[100]'>
                {isSearching ? (
                  <div className='p-4 text-center text-text-secondary'>
                    Searching...
                  </div>
                ) : (
                  <ul>
                    {searchResults.map(game => (
                      <li
                        key={game.steam_appid}
                        className='p-3 hover:bg-surface-hover cursor-pointer border-b border-border-dark/30 last:border-0 flex items-center gap-3 transition-colors'
                        onClick={() => handleAddGame(game)}
                      >
                        <img
                          src={game.header_image}
                          alt={game.name}
                          className='w-12 h-12 object-cover rounded'
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-bold text-white truncate'>
                            {game.name}
                          </p>
                          <p className='text-xs text-text-secondary truncate'>
                            {game.developers?.join(', ')}
                          </p>
                        </div>
                        <span className='material-symbols-outlined text-primary'>
                          add_circle
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className='flex items-center gap-3 ml-6'>
            <button className='size-10 rounded-full bg-surface-dark hover:bg-surface-hover text-white flex items-center justify-center transition-colors border border-border-dark relative'>
              <span className='material-symbols-outlined text-[20px]'>
                notifications
              </span>
              <span className='absolute top-2 right-2 size-2 bg-primary rounded-full border border-surface-dark'></span>
            </button>

            {/* User Avatar + Dropdown */}
            <div className='relative' ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className='size-10 rounded-full bg-center bg-no-repeat bg-cover border-2 border-border-dark hover:border-primary/50 transition-colors cursor-pointer'
                style={{
                  backgroundImage: `url("${user.avatar_url}")`,
                }}
              />

              {showUserMenu && (
                <div className='absolute top-full right-0 mt-2 w-64 bg-surface-dark border border-border-dark rounded-xl shadow-xl overflow-hidden z-[100]'>
                  {/* User Info */}
                  <div className='p-4 flex items-center gap-3'>
                    <div
                      className='bg-center bg-no-repeat bg-cover rounded-full size-10 border border-border-dark shrink-0'
                      style={{
                        backgroundImage: `url("${user.avatar_url}")`,
                      }}
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-bold text-white truncate'>
                        {user.display_name}
                      </p>
                      <p className='text-xs text-text-secondary truncate'>
                        {user.steam_id}
                      </p>
                    </div>
                  </div>

                  <div className='border-t border-border-dark' />

                  {/* Menu Items */}
                  <div className='py-1'>
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-surface-hover transition-colors text-left'
                    >
                      <span className='material-symbols-outlined text-[20px] text-text-secondary'>
                        person
                      </span>
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-surface-hover transition-colors text-left'
                    >
                      <span className='material-symbols-outlined text-[20px] text-text-secondary'>
                        settings
                      </span>
                      Settings
                    </button>
                  </div>

                  <div className='border-t border-border-dark' />

                  {/* Logout */}
                  <div className='py-1'>
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left'
                    >
                      <span className='material-symbols-outlined text-[20px]'>
                        logout
                      </span>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className='flex-1 w-full p-6 md:p-8 lg:px-10 lg:py-8 flex flex-col'>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
