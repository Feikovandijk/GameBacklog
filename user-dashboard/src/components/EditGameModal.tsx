import React, { useState, useEffect } from 'react';
import type { UserGame } from '../services/api';
import StarRating from './shared/StarRating';
import TagInput from './shared/TagInput';

interface EditGameModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: Partial<UserGame>) => void;
  onDelete: () => void;
  game: UserGame | null;
  isAnalysisFlow?: boolean;
}

const EditGameModal: React.FC<EditGameModalProps> = ({
  open,
  onCancel,
  onOk,
  onDelete,
  game,
  isAnalysisFlow = false,
}) => {
  const [formData, setFormData] = useState<{
    status: string;
    priority: number;
    user_rating: number | undefined;
    user_notes: string;
    user_tags: string[];
    hours_played: number;
    completion_percentage: number;
    is_favorite: boolean;
    in_backlog: boolean;
    analysis: Record<string, string>;
  }>({
    status: '',
    priority: 0,
    user_rating: undefined,
    user_notes: '',
    user_tags: [],
    hours_played: 0,
    completion_percentage: 0,
    is_favorite: false,
    in_backlog: false,
    analysis: {},
  });

  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (open && game) {
      setFormData({
        status: game.status,
        priority: game.priority || 0,
        user_rating: game.user_rating,
        user_notes: game.user_notes || '',
        user_tags: game.user_tags || [],
        hours_played: game.hours_played || 0,
        completion_percentage: game.completion_percentage || 0,
        is_favorite: game.is_favorite || false,
        in_backlog: game.in_backlog || false,
        analysis: game.analysis || {},
      });
      setDescExpanded(false);
    }
  }, [open, game]);

  if (!open || !game) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOk({
      ...formData,
      status: formData.status as UserGame['status'],
    });
  };

  const g = game.game;

  const formatPrice = (cents: number | undefined, currency?: string) => {
    if (cents === undefined || cents === null) return 'N/A';
    if (cents === 0) return 'Free to Play';
    const amount = (cents / 100).toFixed(2);
    return currency ? `${amount} ${currency}` : `$${amount}`;
  };

  const formatNumber = (n: number | undefined) => {
    if (n === undefined || n === null) return 'N/A';
    return n.toLocaleString();
  };

  const reviewColor =
    (g?.positive_rating_percentage ?? 0) >= 70
      ? 'bg-emerald-500'
      : (g?.positive_rating_percentage ?? 0) >= 40
        ? 'bg-accent-yellow'
        : 'bg-red-500';

  const formatTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  const formatDuration = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Less than a day';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0
      ? `${years}y ${rem}m`
      : `${years} year${years > 1 ? 's' : ''}`;
  };

  const quickActions: {
    status: string;
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
  }[] = [
      {
        status: 'analysis_needed',
        label: 'Analyze',
        icon: 'science',
        color: 'text-accent-orange',
        bg: 'bg-accent-orange/10',
        border: 'border-accent-orange/20',
      },
      {
        status: 'currently_playing',
        label: 'Playing',
        icon: 'play_circle',
        color: 'text-accent-purple',
        bg: 'bg-accent-purple/10',
        border: 'border-accent-purple/20',
      },
      {
        status: 'completed',
        label: 'Complete',
        icon: 'check_circle',
        color: 'text-accent-green',
        bg: 'bg-accent-green/10',
        border: 'border-accent-green/20',
      },
      {
        status: 'on_hold',
        label: 'Hold',
        icon: 'pause_circle',
        color: 'text-accent-orange',
        bg: 'bg-accent-orange/10',
        border: 'border-accent-orange/20',
      },
    ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
      <div
        className='bg-surface-dark border border-border-dark rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-fade-in-up'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/5'>
          <div className='flex items-center gap-3 min-w-0'>
            <span className='material-symbols-outlined text-primary text-[24px]'>
              analytics
            </span>
            <h2 className='text-xl font-bold text-white truncate'>
              Game Analysis
            </h2>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() =>
                setFormData(prev => ({
                  ...prev,
                  is_favorite: !prev.is_favorite,
                }))
              }
              className='p-1.5 rounded-lg hover:bg-white/5 transition-colors'
              title={
                formData.is_favorite
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-colors ${formData.is_favorite ? 'text-red-500' : 'text-text-secondary/50'}`}
                style={{
                  fontVariationSettings: formData.is_favorite
                    ? "'FILL' 1"
                    : "'FILL' 0",
                }}
              >
                favorite
              </span>
            </button>
            <button
              onClick={onCancel}
              className='text-text-secondary hover:text-white transition-colors p-1'
            >
              <span className='material-symbols-outlined'>close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='p-6 max-h-[80vh] overflow-y-auto'>
          <div className='grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6'>
            {/* Left Panel — Steam Metadata */}
            <div className='space-y-5'>
              {/* Header Image */}
              <div className='aspect-video rounded-xl overflow-hidden border border-white/10 bg-background-dark'>
                <img
                  src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                  alt={g?.name}
                  className='w-full h-full object-cover'
                  loading='lazy'
                />
              </div>

              {/* Game Title */}
              <h3 className='text-lg font-bold text-white leading-tight'>
                {g?.name || 'Unknown Game'}
              </h3>

              {/* Market Data */}
              <div>
                <div className='flex items-center gap-1.5 mb-3'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    monitoring
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Market Data
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  {/* Reviews */}
                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='material-symbols-outlined text-[14px] text-text-secondary'>
                        reviews
                      </span>
                      <span className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Reviews
                      </span>
                    </div>
                    {g?.total_reviews ? (
                      <>
                        <div className='text-white text-sm font-bold'>
                          {g.positive_rating_percentage}% positive
                        </div>
                        <div className='h-1.5 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden'>
                          <div
                            className={`h-full ${reviewColor} rounded-full`}
                            style={{
                              width: `${g.positive_rating_percentage}%`,
                            }}
                          />
                        </div>
                        <div className='text-[10px] text-text-secondary mt-1'>
                          {formatNumber(g.total_reviews)} reviews
                        </div>
                      </>
                    ) : (
                      <div className='text-text-secondary text-sm'>N/A</div>
                    )}
                  </div>

                  {/* Current Players */}
                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='material-symbols-outlined text-[14px] text-text-secondary'>
                        group
                      </span>
                      <span className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Players
                      </span>
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {formatNumber(g?.current_players)}
                    </div>
                    <div className='text-[10px] text-text-secondary mt-0.5'>
                      online now
                    </div>
                  </div>

                  {/* Price */}
                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='material-symbols-outlined text-[14px] text-text-secondary'>
                        sell
                      </span>
                      <span className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Price
                      </span>
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {formatPrice(g?.price_final, g?.price_currency)}
                    </div>
                  </div>

                  {/* Release Date */}
                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='material-symbols-outlined text-[14px] text-text-secondary'>
                        calendar_today
                      </span>
                      <span className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Released
                      </span>
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {g?.release_date
                        ? new Date(g.release_date).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Developers & Publishers */}
              <div className='space-y-2'>
                {g?.developers && g.developers.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <span className='material-symbols-outlined text-[16px] text-text-secondary mt-0.5'>
                      code
                    </span>
                    <div>
                      <div className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Developers
                      </div>
                      <div className='text-white text-sm'>
                        {g.developers.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
                {g?.publishers && g.publishers.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <span className='material-symbols-outlined text-[16px] text-text-secondary mt-0.5'>
                      business
                    </span>
                    <div>
                      <div className='text-[10px] uppercase tracking-wider text-text-secondary'>
                        Publishers
                      </div>
                      <div className='text-white text-sm'>
                        {g.publishers.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Backlog History */}
              <div>
                <div className='flex items-center gap-1.5 mb-3'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    history
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Backlog History
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-0.5'>
                      Added
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {game.added_at
                        ? new Date(game.added_at).toLocaleDateString()
                        : 'N/A'}
                    </div>
                    {game.added_at && (
                      <div className='text-[10px] text-text-secondary mt-0.5'>
                        {formatTimeAgo(game.added_at)}
                      </div>
                    )}
                  </div>

                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-0.5'>
                      Time in Backlog
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {formatDuration(game.added_at) || 'N/A'}
                    </div>
                  </div>

                  <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                    <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-0.5'>
                      Last Played
                    </div>
                    <div className='text-white text-sm font-bold'>
                      {game.last_played
                        ? new Date(game.last_played).toLocaleDateString()
                        : 'Never'}
                    </div>
                    {game.last_played && (
                      <div className='text-[10px] text-text-secondary mt-0.5'>
                        {formatTimeAgo(game.last_played)}
                      </div>
                    )}
                  </div>

                  {game.completed_at && (
                    <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                      <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-0.5'>
                        Completed
                      </div>
                      <div className='text-white text-sm font-bold'>
                        {new Date(game.completed_at).toLocaleDateString()}
                      </div>
                      <div className='text-[10px] text-text-secondary mt-0.5'>
                        {formatTimeAgo(game.completed_at)}
                      </div>
                    </div>
                  )}

                  {game.playtime_2weeks != null && game.playtime_2weeks > 0 && (
                    <div className='bg-background-dark/50 border border-white/5 rounded-xl p-3'>
                      <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-0.5'>
                        Last 2 Weeks
                      </div>
                      <div className='text-white text-sm font-bold'>
                        {game.playtime_2weeks < 1
                          ? `${Math.round(game.playtime_2weeks * 60)}m`
                          : `${game.playtime_2weeks.toFixed(1)}h`}
                      </div>
                      <div className='text-[10px] text-text-secondary mt-0.5'>
                        recent playtime
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Genres */}
              {g?.genres && g.genres.length > 0 && (
                <div>
                  <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-1.5'>
                    Genres
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {g.genres.map((genre, i) => (
                      <span
                        key={i}
                        className='text-[10px] uppercase tracking-wider text-text-secondary font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5'
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Description */}
              {g?.short_description && (
                <div>
                  <div className='text-[10px] uppercase tracking-wider text-text-secondary mb-1.5'>
                    Description
                  </div>
                  <p
                    className={`text-sm text-text-secondary leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}
                  >
                    {g.short_description}
                  </p>
                  {g.short_description.length > 150 && (
                    <button
                      type='button'
                      className='text-primary text-xs mt-1 hover:underline'
                      onClick={() => setDescExpanded(!descExpanded)}
                    >
                      {descExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel — Editable Fields */}
            <form
              id='edit-game-form'
              onSubmit={handleSubmit}
              className='space-y-6'
            >
              {/* Quick Actions */}
              <div>
                <div className='flex items-center gap-1.5 mb-3'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    bolt
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Quick Actions
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {quickActions
                    .filter(a => a.status !== formData.status)
                    .map(action => (
                      <button
                        key={action.status}
                        type='button'
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors hover:brightness-125 ${action.color} ${action.bg} ${action.border}`}
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            status: action.status,
                          }))
                        }
                      >
                        <span className='material-symbols-outlined text-[14px]'>
                          {action.icon}
                        </span>
                        {action.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Backlog Toggle */}
              <div>
                <div className='flex items-center gap-1.5 mb-3'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    bookmark
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Backlog
                  </span>
                </div>
                <button
                  type='button'
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${formData.in_backlog
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-background-dark border-border-dark text-text-secondary hover:text-white hover:border-white/20'
                    }`}
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      in_backlog: !prev.in_backlog,
                    }))
                  }
                >
                  <span
                    className='material-symbols-outlined text-[18px]'
                    style={{
                      fontVariationSettings: formData.in_backlog
                        ? "'FILL' 1"
                        : "'FILL' 0",
                    }}
                  >
                    bookmark
                  </span>
                  {formData.in_backlog ? 'In Backlog' : 'Not in Backlog'}
                </button>
              </div>

              {/* Section: Analysis Status */}
              <div>
                <div className='flex items-center gap-1.5 mb-4'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    tune
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Analysis Status
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Status */}
                  <div>
                    <label className='block text-sm font-medium text-text-secondary mb-2'>
                      Status <span className='text-red-400'>*</span>
                    </label>
                    <div className='relative'>
                      <select
                        className='block w-full pl-3 pr-10 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                        value={formData.status}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        required
                      >
                        <option value='want_to_play'>Want to Play</option>
                        <option value='currently_playing'>
                          Currently Playing
                        </option>
                        <option value='analysis_needed'>Analysis Needed</option>
                        <option value='completed'>Completed</option>
                        <option value='completed_100'>100% Completed</option>
                        <option value='on_hold'>On Hold</option>
                        <option value='dropped'>Dropped</option>
                        <option value='unplayed'>Unplayed</option>
                      </select>
                      <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                        <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className='block text-sm font-medium text-text-secondary mb-2'>
                      Priority
                    </label>
                    <div className='flex gap-1.5'>
                      <button
                        type='button'
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${formData.priority === 0
                          ? 'bg-primary text-background-dark'
                          : 'bg-background-dark border border-border-dark text-text-secondary hover:text-white hover:border-white/20'
                          }`}
                        onClick={() =>
                          setFormData(prev => ({ ...prev, priority: 0 }))
                        }
                      >
                        None
                      </button>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type='button'
                          className={`w-10 py-2 rounded-xl text-sm font-bold transition-colors ${formData.priority === n
                            ? 'bg-primary text-background-dark'
                            : 'bg-background-dark border border-border-dark text-text-secondary hover:text-white hover:border-white/20'
                            }`}
                          onClick={() =>
                            setFormData(prev => ({ ...prev, priority: n }))
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Progress Tracking */}
              {!isAnalysisFlow && (
                <div>
                  <div className='flex items-center gap-1.5 mb-4'>
                    <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                      trending_up
                    </span>
                    <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                      Progress Tracking
                    </span>
                  </div>

                  <div className='space-y-4'>
                    {/* Completion Percentage */}
                    <div>
                      <label className='block text-sm font-medium text-text-secondary mb-2'>
                        Completion
                      </label>
                      <div className='flex items-center gap-3'>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          className='flex-1 accent-primary h-1.5'
                          value={formData.completion_percentage}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              completion_percentage: parseInt(e.target.value),
                            }))
                          }
                        />
                        <div className='flex items-center'>
                          <input
                            type='number'
                            min='0'
                            max='100'
                            className='w-16 px-2 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-sm text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
                            value={formData.completion_percentage}
                            onChange={e => {
                              const val = Math.min(
                                100,
                                Math.max(0, parseInt(e.target.value) || 0)
                              );
                              setFormData(prev => ({
                                ...prev,
                                completion_percentage: val,
                              }));
                            }}
                          />
                          <span className='text-text-secondary text-sm ml-1'>
                            %
                          </span>
                        </div>
                      </div>
                      <div className='h-1 w-full bg-border-dark rounded-full overflow-hidden mt-2'>
                        <div
                          className='h-full bg-primary rounded-full shadow-[0_0_6px_rgba(0,229,188,0.4)] transition-all'
                          style={{
                            width: `${formData.completion_percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {/* Hours Played */}
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          Hours Played
                        </label>
                        <div className='relative'>
                          <span className='absolute left-3 top-1/2 -translate-y-1/2'>
                            <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                              schedule
                            </span>
                          </span>
                          <input
                            type='number'
                            min='0'
                            step='0.1'
                            className='block w-full pl-10 pr-4 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                            value={formData.hours_played}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hours_played: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {/* User Rating */}
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          Your Rating
                        </label>
                        <StarRating
                          value={formData.user_rating}
                          onChange={val =>
                            setFormData(prev => ({
                              ...prev,
                              user_rating: val,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Research Tags & Notes */}
              <div>
                <div className='flex items-center gap-1.5 mb-4'>
                  <span className='material-symbols-outlined text-[16px] text-text-secondary'>
                    label
                  </span>
                  <span className='text-xs uppercase tracking-wider text-text-secondary font-semibold'>
                    Research Tags & Notes
                  </span>
                </div>

                <div className='space-y-4'>
                  {/* User Tags */}
                  <div>
                    <label className='block text-sm font-medium text-text-secondary mb-2'>
                      Research Tags
                    </label>
                    <TagInput
                      tags={formData.user_tags}
                      onChange={tags =>
                        setFormData(prev => ({ ...prev, user_tags: tags }))
                      }
                      placeholder='Add research tags (press Enter)...'
                    />
                  </div>

                  {/* Guided Deconstruction or Generic Notes */}
                  {isAnalysisFlow ? (
                    <div className='space-y-4 pt-2'>
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          What worked well (To Steal)
                        </label>
                        <textarea
                          rows={3}
                          className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 text-sm resize-none'
                          placeholder='e.g. The first 15 minutes hook, the UI responsiveness...'
                          value={formData.analysis?.what_worked_well || ''}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              analysis: { ...prev.analysis, what_worked_well: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          What didn't work (To Avoid)
                        </label>
                        <textarea
                          rows={3}
                          className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 text-sm resize-none'
                          placeholder='e.g. Frustrating inventory management, slow tutorials...'
                          value={formData.analysis?.what_didnt_work || ''}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              analysis: { ...prev.analysis, what_didnt_work: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          Takeaways for our game
                        </label>
                        <textarea
                          rows={3}
                          className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none'
                          placeholder='e.g. We should adopt their fast-travel unlock pacing...'
                          value={formData.analysis?.takeaways || ''}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              analysis: { ...prev.analysis, takeaways: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-text-secondary mb-2'>
                          External Document Link (Optional)
                        </label>
                        <div className='relative'>
                          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                            <span className='material-symbols-outlined text-text-secondary text-[16px]'>
                              link
                            </span>
                          </div>
                          <input
                            type='url'
                            className='block w-full pl-9 pr-4 py-2 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                            placeholder='e.g. Google Docs, Notion, Miro board...'
                            value={formData.analysis?.document_link || ''}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                analysis: { ...prev.analysis, document_link: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className='block text-sm font-medium text-text-secondary mb-2'>
                        Analysis Notes
                      </label>
                      <textarea
                        rows={4}
                        className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none'
                        placeholder='Document competitive analysis, design patterns, mechanics worth studying...'
                        value={formData.user_notes}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            user_notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className='p-6 border-t border-white/5 bg-background-dark/50 flex items-center justify-between'>
          <button
            type='button'
            onClick={onDelete}
            className='px-5 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-medium transition-colors'
          >
            Delete
          </button>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={onCancel}
              className='px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              form='edit-game-form'
              className='px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background-dark font-bold shadow-lg shadow-primary/20 transition-all'
            >
              Save Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGameModal;
