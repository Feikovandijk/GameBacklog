import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userGamesAPI, authAPI, gamesAPI } from '../services/api';
import type { DashboardStats, User, UserGame, Game, PopularTag } from '../services/api';

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [recentlyPlayed, setRecentlyPlayed] = useState<UserGame[]>([]);
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, statsRes, recentRes, trendingRes, tagsRes] = await Promise.allSettled([
          authAPI.getCurrentUser(),
          userGamesAPI.getDashboardStats(),
          userGamesAPI.getRecentlyPlayed(3),
          gamesAPI.getTrendingGames(5, 7),
          gamesAPI.getPopularTags(4, 7),
        ]);

        if (userRes.status === 'fulfilled') setUser(userRes.value.data);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (recentRes.status === 'fulfilled') setRecentlyPlayed(recentRes.value.data);
        if (trendingRes.status === 'fulfilled') setTrendingGames(trendingRes.value.data);
        if (tagsRes.status === 'fulfilled') setPopularTags(tagsRes.value.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to maintain strict gradients based on index or game ID to keep the design consistent
  const getGradient = (index: number) => {
    const gradients = [
      'from-indigo-900 to-purple-900',
      'from-slate-800 to-gray-700',
      'from-emerald-900 to-teal-900',
      'from-blue-900 to-cyan-900',
      'from-red-900 to-orange-900',
    ];
    return gradients[index % gradients.length];
  };

  const getTimeSince = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      currently_playing: 'Playing',
      completed: 'Completed',
      want_to_play: 'To Play',
      dropped: 'Dropped',
      on_hold: 'On Hold',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      {/* Welcome Section */}
      <div className='flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4'>
        <div className='flex flex-col max-w-[700px]'>
          <h1 className='text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight mb-2'>
            Developer Dashboard
          </h1>
          <p className='text-text-secondary text-base font-normal leading-normal'>
            Welcome back, {user?.display_name || 'Admin'}. Here's what's
            happening in your game ecosystem today.
          </p>
        </div>
        <div className='flex gap-3'>
          <button className='flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-dark bg-surface-dark hover:bg-surface-hover text-white text-sm font-medium transition-colors'>
            <span className='material-symbols-outlined text-[18px]'>
              calendar_today
            </span>
            This Week
          </button>
          <button
            onClick={() => navigate('/add-game')}
            className='flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold shadow-lg shadow-primary/20 transition-all'
          >
            <span className='material-symbols-outlined text-[18px] font-bold'>
              add
            </span>
            Track New Game
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark flex items-center gap-4 hover:border-primary/30 transition-colors shadow-sm'>
          <div className='size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary'>
            <span className='material-symbols-outlined text-[28px]'>
              inventory_2
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-sm font-medium'>
              Games in Library
            </p>
            <h3 className='text-white text-3xl font-bold'>
              {stats?.totalGames || 0}
            </h3>
          </div>

        </div>
        <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark flex items-center gap-4 hover:border-primary/30 transition-colors shadow-sm'>
          <div className='size-12 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue'>
            <span className='material-symbols-outlined text-[28px]'>
              sports_esports
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-sm font-medium'>
              Want to Play
            </p>
            <h3 className='text-white text-3xl font-bold'>
              {stats?.wantToPlay || 0}
            </h3>
          </div>

        </div>
        <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark flex items-center gap-4 hover:border-primary/30 transition-colors shadow-sm'>
          <div className='size-12 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple'>
            <span className='material-symbols-outlined text-[28px]'>
              note_alt
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-sm font-medium'>
              Completed Games
            </p>
            <h3 className='text-white text-3xl font-bold'>
              {stats?.completedGames || 0}
            </h3>
          </div>
          <div className='ml-auto flex -space-x-2'>
            {/* Icons removed */}
          </div>
        </div>
      </div>

      {/* Recently Played / Resume Analysis */}
      <div className='flex flex-col gap-4 mb-8'>
        <div className='flex items-center justify-between'>
          <h2 className='text-white text-xl font-bold flex items-center gap-2'>
            <span className='material-symbols-outlined text-primary'>
              history
            </span>
            Quick Resume
          </h2>
          <div className='flex gap-2'>
            <button className='size-8 rounded-lg border border-border-dark flex items-center justify-center text-text-secondary hover:text-white hover:bg-surface-hover transition-colors'>
              <span className='material-symbols-outlined text-[18px]'>
                chevron_left
              </span>
            </button>
            <button className='size-8 rounded-lg border border-border-dark flex items-center justify-center text-text-secondary hover:text-white hover:bg-surface-hover transition-colors'>
              <span className='material-symbols-outlined text-[18px]'>
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {recentlyPlayed.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {recentlyPlayed.map((userGame, index) => (
              <div
                key={userGame.id}
                className='bg-surface-dark rounded-2xl border border-border-dark overflow-hidden group hover:border-primary/50 transition-all cursor-pointer'
                onClick={() => navigate('/games')}
              >
                <div
                  className={`h-32 bg-gradient-to-br ${getGradient(index)} relative`}
                >
                  <img
                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${userGame.steam_appid}/header.jpg`}
                    alt={userGame.game?.name}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:opacity-80 transition-opacity"
                    loading='lazy'
                  />
                  <div className='absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors'></div>
                  <div className='absolute bottom-3 left-4'>
                    <span className='bg-background-dark/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-white/10'>
                      {getStatusLabel(userGame.status)}
                    </span>
                  </div>
                </div>
                <div className='p-5'>
                  <div className='flex justify-between items-start mb-3'>
                    <div>
                      <h3 className='text-white font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1'>
                        {userGame.game?.name || 'Unknown Game'}
                      </h3>
                      <p className='text-text-secondary text-xs mt-1'>
                        Last played {getTimeSince(userGame.updated_at)}
                      </p>
                    </div>
                    <span className='size-8 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-background-dark transition-colors'>
                      <span className='material-symbols-outlined text-[18px]'>
                        arrow_forward
                      </span>
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-xs text-text-secondary mb-2'>
                    <span>{userGame.hours_played}h played</span>
                    <span className='text-primary font-bold'>
                      {userGame.completion_percentage || 0}%
                    </span>
                  </div>
                  <div className='h-1.5 w-full bg-border-dark rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-primary rounded-full shadow-[0_0_8px_rgba(0,229,188,0.5)]'
                      style={{ width: `${userGame.completion_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-dark rounded-2xl border border-border-dark p-8 text-center">
            <p className="text-text-secondary mb-4">You haven't tracked any games yet.</p>
            <button
              onClick={() => navigate('/add-game')}
              className="px-4 py-2 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors"
            >
              Start Tracking
            </button>
          </div>
        )}
      </div>

      {/* Market Pulse & Community Insights */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 h-full'>
        {/* Market Pulse */}
        <div className='lg:col-span-2 flex flex-col gap-6'>
          <section className='flex flex-col bg-surface-dark rounded-2xl border border-border-dark overflow-hidden shadow-sm h-full'>
            <div className='p-5 border-b border-border-dark flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='size-10 rounded-lg bg-surface-hover flex items-center justify-center text-primary'>
                  <span className='material-symbols-outlined'>
                    candlestick_chart
                  </span>
                </div>
                <div>
                  <h2 className='text-white text-lg font-bold'>Market Pulse</h2>
                  <p className='text-text-secondary text-xs'>
                    Trending games released this week
                  </p>
                </div>
              </div>
              <button className='text-sm text-primary font-bold hover:underline'>
                View Full Report
              </button>
            </div>
            <div className='flex-1 overflow-x-auto'>
              <table className='w-full text-left border-collapse'>
                <thead>
                  <tr className='border-b border-border-dark bg-background-dark/30 text-xs text-text-secondary uppercase tracking-wider'>
                    <th className='px-6 py-4 font-semibold'>Game Title</th>
                    <th className='px-6 py-4 font-semibold'>Reviews</th>
                    <th className='px-6 py-4 font-semibold text-right'>
                      Avg Players
                    </th>
                    <th className='px-6 py-4 font-semibold text-right'>
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className='text-sm divide-y divide-border-dark/50'>
                  {trendingGames.map((game) => (
                    <tr
                      key={game.id}
                      className='group hover:bg-surface-hover/50 transition-colors'
                    >
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-3'>
                          <img
                            src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                            alt={game.name}
                            className="w-10 h-10 object-cover rounded"
                            loading='lazy'
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <span className='font-bold text-white group-hover:text-primary transition-colors line-clamp-1'>
                            {game.name}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4 text-text-secondary'>
                        {game.total_reviews?.toLocaleString() || 'N/A'}
                      </td>
                      <td className='px-6 py-4 text-right text-white font-mono'>
                        {/* Use current_players if available, otherwise just mock or exclude for now if not in type */}
                        {game.current_players?.toLocaleString() || 'N/A'}
                      </td>
                      <td className='px-6 py-4 text-right font-mono text-text-secondary'>
                        {game.price_final ? `$${(game.price_final / 100).toFixed(2)}` : 'Free'}
                      </td>
                    </tr>
                  ))}
                  {trendingGames.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                        Loading trending games...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Popular Tags */}
        <div className='lg:col-span-1 flex flex-col gap-6'>
          <section className='flex flex-col bg-surface-dark rounded-2xl border border-border-dark overflow-hidden p-5 h-full'>
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-white text-lg font-bold'>
                Popular Tags
              </h2>
              <div className='flex items-center gap-1 text-text-secondary text-xs'>
                <span className='material-symbols-outlined text-[16px]'>
                  schedule
                </span>
                This Week
              </div>
            </div>
            <p className='text-text-secondary text-sm mb-4'>
              Tags appearing most often in this week's top games.
            </p>
            <div className='flex flex-col gap-3'>
              {popularTags.length > 0 ? (
                popularTags.map((tag, index) => {
                  // Bar width based on % of top 50 games with this tag (max is 50 games)
                  const maxGames = 50;
                  const percentage = Math.round((tag.count / maxGames) * 100);
                  const barWidth = Math.max(15, percentage);

                  // Different colors for different ranks
                  const colors = [
                    'bg-primary',
                    'bg-accent-blue',
                    'bg-accent-purple',
                    'bg-text-secondary/60',
                  ];
                  const barColor = colors[index] || colors[3];

                  return (
                    <div
                      key={tag.name}
                      className='group bg-background-dark/50 border border-border-dark rounded-xl p-3 hover:border-primary/50 transition-all cursor-pointer'
                    >
                      <div className='flex justify-between items-start'>
                        <div className='flex flex-col'>
                          <span className='text-white font-bold text-sm group-hover:text-primary transition-colors'>
                            {tag.name}
                          </span>
                          <span className='text-text-secondary text-xs mt-1'>
                            in {tag.count} of top 50 games
                          </span>
                        </div>
                        <div className='flex items-center text-primary text-xs font-bold'>
                          <span className='material-symbols-outlined text-[16px]'>
                            trending_up
                          </span>
                        </div>
                      </div>
                      <div className='mt-3 flex items-center gap-2'>
                        <div className='h-1 flex-1 bg-border-dark rounded-full overflow-hidden'>
                          <div
                            className={`h-full ${barColor} rounded-full`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className='text-xs text-text-secondary font-mono'>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className='text-center text-text-secondary py-4'>
                  Loading tags...
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
