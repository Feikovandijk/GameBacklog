import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { userGamesAPI } from '../services/api';
import type { UserGame } from '../services/api';
import EditGameModal from './EditGameModal';
import AddToBoardModal from './AddToBoardModal';
import StatusBadge from './shared/StatusBadge';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const getImageSrc = (game: UserGame) =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`;

const StarDisplay: React.FC<{ value: number | undefined }> = ({ value }) => (
  <div className='flex items-center gap-0.5'>
    {Array.from({ length: 5 }, (_, i) => i + 1).map(star => (
      <span
        key={star}
        className={`material-symbols-outlined text-[14px] ${star <= (value ?? 0) ? 'text-yellow-400' : 'text-text-secondary/25'}`}
        style={{
          fontVariationSettings: star <= (value ?? 0) ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        star
      </span>
    ))}
  </div>
);

/* ─── Analysis card ───────────────────────────────────────────────────────── */

interface AnalysisCardProps {
  game: UserGame;
  onClick: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ game, onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type='button'
      onClick={onClick}
      className='w-full text-left bg-surface-dark border border-border-dark rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group'
    >
      {/* Thumbnail */}
      <div className='relative w-full aspect-video bg-background-dark overflow-hidden'>
        {!imgFailed ? (
          <img
            src={getImageSrc(game)}
            alt={game.game?.name}
            className='w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300'
            loading='lazy'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='material-symbols-outlined text-[32px] text-text-secondary/30'>
              sports_esports
            </span>
          </div>
        )}
        {/* Rating badge */}
        {game.user_rating !== undefined && (
          <div className='absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1'>
            <StarDisplay value={game.user_rating} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className='p-4 space-y-3'>
        {/* Title + status */}
        <div className='flex items-start justify-between gap-2'>
          <h3 className='text-white font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2 flex-1'>
            {game.game?.name || 'Unknown Game'}
          </h3>
          <StatusBadge status={game.status} minimal />
        </div>

        {/* Meta row */}
        <div className='flex items-center gap-3 text-xs text-text-secondary'>
          {(game.hours_played ?? 0) > 0 && (
            <span className='flex items-center gap-1'>
              <span className='material-symbols-outlined text-[13px]'>schedule</span>
              {game.hours_played! < 1
                ? `${Math.round(game.hours_played! * 60)}m`
                : `${game.hours_played!.toFixed(1)}h`}
            </span>
          )}
          {(game.completion_percentage ?? 0) > 0 && (
            <span className='flex items-center gap-1'>
              <span className='material-symbols-outlined text-[13px]'>donut_large</span>
              {game.completion_percentage}%
            </span>
          )}
        </div>

        {/* Research tags */}
        {game.user_tags && game.user_tags.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {game.user_tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className='text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20'
              >
                {tag}
              </span>
            ))}
            {game.user_tags.length > 4 && (
              <span className='text-[10px] text-text-secondary px-1 py-0.5'>
                +{game.user_tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Notes preview */}
        {game.user_notes && (
          <p className='text-xs text-text-secondary leading-relaxed line-clamp-3 border-t border-border-dark pt-3'>
            {game.user_notes}
          </p>
        )}
      </div>
    </button>
  );
};

/* ─── Queue card (analysis_needed) ───────────────────────────────────────── */

interface QueueCardProps {
  game: UserGame;
  onClick: () => void;
}

const QueueCard: React.FC<QueueCardProps> = ({ game, onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type='button'
      onClick={onClick}
      className='w-full text-left flex items-center gap-4 p-4 bg-background-dark/50 rounded-xl border border-border-dark hover:border-accent-orange/40 cursor-pointer transition-all group'
    >
      <div className='relative w-20 h-12 rounded-lg overflow-hidden bg-surface-hover flex-shrink-0'>
        {!imgFailed ? (
          <img
            src={getImageSrc(game)}
            alt={game.game?.name}
            className='w-full h-full object-cover'
            loading='lazy'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='material-symbols-outlined text-[18px] text-text-secondary/30'>
              sports_esports
            </span>
          </div>
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <h4 className='text-white font-semibold text-sm truncate group-hover:text-accent-orange transition-colors'>
          {game.game?.name || 'Unknown Game'}
        </h4>
        <div className='flex items-center gap-2 mt-1 text-xs text-text-secondary'>
          {game.game?.genres && game.game.genres.length > 0 && (
            <span>{game.game.genres.slice(0, 2).join(', ')}</span>
          )}
          {(game.hours_played ?? 0) > 0 && (
            <span className='flex items-center gap-0.5'>
              <span className='material-symbols-outlined text-[12px]'>schedule</span>
              {game.hours_played!.toFixed(1)}h
            </span>
          )}
        </div>
      </div>

      <span className='material-symbols-outlined text-accent-orange text-[20px] opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0'>
        science
      </span>
    </button>
  );
};

/* ─── Main component ──────────────────────────────────────────────────────── */

const AnalysisPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analysisQueue, setAnalysisQueue] = useState<UserGame[]>([]);
  const [analyzedGames, setAnalyzedGames] = useState<UserGame[]>([]);
  const [searchText, setSearchText] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | ''>('');
  const [tagFilter, setTagFilter] = useState('');

  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const [queueRes, notesRes] = await Promise.all([
        userGamesAPI.get({ status: 'analysis_needed', limit: 50 }),
        userGamesAPI.get({ has_notes: true, limit: 200 }),
      ]);

      setAnalysisQueue(queueRes.data.documents);
      setAnalyzedGames(notesRes.data.documents);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Derived stats ─────────────────────────────────────────────────── */

  const ratedGames = analyzedGames.filter(g => g.user_rating !== undefined);
  const avgRating =
    ratedGames.length > 0
      ? ratedGames.reduce((s, g) => s + (g.user_rating ?? 0), 0) /
      ratedGames.length
      : 0;

  const allTags = Array.from(
    new Set(analyzedGames.flatMap(g => g.user_tags || []))
  ).sort();

  /* ── Filtered research library ─────────────────────────────────────── */

  const filteredAnalyzed = useMemo(
    () =>
      analyzedGames.filter(g => {
        const nameMatch =
          !searchText ||
          g.game?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          g.user_notes.toLowerCase().includes(searchText.toLowerCase());

        const ratingMatch =
          ratingFilter === '' || g.user_rating === ratingFilter;

        const tagMatch =
          !tagFilter ||
          (g.user_tags || []).some(t =>
            t.toLowerCase().includes(tagFilter.toLowerCase())
          );

        return nameMatch && ratingMatch && tagMatch;
      }),
    [analyzedGames, searchText, ratingFilter, tagFilter]
  );

  /* ── Modal handlers ────────────────────────────────────────────────── */

  const handleOpenGame = (game: UserGame) => {
    setSelectedGame(game);
    setIsModalOpen(true);
  };

  const handleUpdateGame = async (values: Partial<UserGame>) => {
    if (!selectedGame) return;
    try {
      await userGamesAPI.updateGame(selectedGame.id, values);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update game:', error);
    }
  };

  const handleDeleteGame = async () => {
    if (!selectedGame) return;
    try {
      await userGamesAPI.removeGame(selectedGame.id);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  /* ── Loading ───────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-surface-dark border-t-primary' />
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className='flex flex-col gap-8'>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <div className='flex items-center gap-3 mb-2'>
          <div className='size-10 rounded-lg bg-surface-hover flex items-center justify-center text-primary shadow-lg shadow-primary/20'>
            <span className='material-symbols-outlined text-[20px]'>
              analytics
            </span>
          </div>
          <h1 className='text-3xl font-bold text-white tracking-tight'>
            Game Analysis
          </h1>
        </div>
        <p className='text-text-secondary'>
          Write, review, and manage your personal game analyses and research
          notes.
        </p>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Analyses written */}
        <div className='bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4'>
          <div className='size-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0'>
            <span className='material-symbols-outlined text-primary text-[22px]'>
              edit_note
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-xs uppercase font-bold tracking-wider'>
              Analyses
            </p>
            <h3 className='text-2xl font-bold text-white'>
              {analyzedGames.length}
            </h3>
          </div>
        </div>

        {/* Queue */}
        <div className='bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4'>
          <div className='size-11 rounded-xl bg-accent-orange/10 flex items-center justify-center flex-shrink-0'>
            <span className='material-symbols-outlined text-accent-orange text-[22px]'>
              science
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-xs uppercase font-bold tracking-wider'>
              In Queue
            </p>
            <h3 className='text-2xl font-bold text-white'>
              {analysisQueue.length}
            </h3>
          </div>
        </div>

        {/* Avg rating */}
        <div className='bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4'>
          <div className='size-11 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0'>
            <span className='material-symbols-outlined text-yellow-400 text-[22px]'>
              star
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-xs uppercase font-bold tracking-wider'>
              Avg Rating
            </p>
            <h3 className='text-2xl font-bold text-white'>
              {ratedGames.length > 0 ? avgRating.toFixed(1) : '—'}
              {ratedGames.length > 0 && (
                <span className='text-text-secondary text-sm font-normal'>
                  /5
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Tags */}
        <div className='bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4'>
          <div className='size-11 rounded-xl bg-accent-purple/10 flex items-center justify-center flex-shrink-0'>
            <span className='material-symbols-outlined text-accent-purple text-[22px]'>
              label
            </span>
          </div>
          <div>
            <p className='text-text-secondary text-xs uppercase font-bold tracking-wider'>
              Research Tags
            </p>
            <h3 className='text-2xl font-bold text-white'>{allTags.length}</h3>
          </div>
        </div>
      </div>

      {/* ── Analysis queue ──────────────────────────────────────────── */}
      <div className='bg-surface-dark p-6 rounded-2xl border border-border-dark'>
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <span className='material-symbols-outlined text-accent-orange text-[20px]'>
              science
            </span>
            Analysis Queue
          </h2>
          <div className='flex items-center gap-3'>
            <span className='text-xs text-text-secondary bg-background-dark px-2.5 py-1 rounded-lg border border-border-dark'>
              {analysisQueue.length} game
              {analysisQueue.length !== 1 ? 's' : ''} waiting
            </span>
            <button
              type='button'
              onClick={() => setShowAddModal(true)}
              className='flex items-center gap-1.5 px-3 py-1.5 bg-accent-orange hover:bg-accent-orange/80 text-background-dark font-medium rounded-xl transition-all text-sm shadow-lg shadow-accent-orange/20'
            >
              <span className='material-symbols-outlined text-[16px]'>add</span>
              Add Game
            </button>
          </div>
        </div>

        {analysisQueue.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
            {analysisQueue.map(game => (
              <QueueCard
                key={game.id}
                game={game}
                onClick={() => handleOpenGame(game)}
              />
            ))}
          </div>
        ) : (
          <div className='py-10 text-center text-text-secondary bg-background-dark/40 rounded-xl border border-dashed border-border-dark'>
            <span className='material-symbols-outlined text-[36px] text-text-secondary/30 block mb-2'>
              check_circle
            </span>
            <p className='text-sm'>Queue is empty — no games awaiting analysis.</p>
            <button
              type='button'
              onClick={() => setShowAddModal(true)}
              className='mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange font-medium rounded-xl transition-all text-sm border border-accent-orange/20'
            >
              <span className='material-symbols-outlined text-[16px]'>add</span>
              Add a game for analysis
            </button>
          </div>
        )}
      </div>

      {/* ── Research library ────────────────────────────────────────── */}
      <div>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5'>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <span className='material-symbols-outlined text-primary text-[20px]'>
              menu_book
            </span>
            Research Library
            <span className='text-sm font-normal text-text-secondary ml-1'>
              ({filteredAnalyzed.length}
              {filteredAnalyzed.length !== analyzedGames.length &&
                ` of ${analyzedGames.length}`}
              )
            </span>
          </h2>

          {/* Filters */}
          <div className='flex flex-wrap gap-2 w-full md:w-auto'>
            {/* Search */}
            <div className='relative flex-1 md:flex-none md:w-60'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <span className='material-symbols-outlined text-text-secondary text-[18px]'>
                  search
                </span>
              </div>
              <input
                type='text'
                className='block w-full pl-9 pr-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                placeholder='Search notes or title…'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            {/* Rating filter */}
            <div className='relative w-36'>
              <select
                className='block w-full pl-3 pr-8 py-2 bg-surface-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                value={ratingFilter}
                onChange={e =>
                  setRatingFilter(
                    e.target.value === '' ? '' : parseInt(e.target.value)
                  )
                }
              >
                <option value=''>All ratings</option>
                {[5, 4, 3, 2, 1].map(r => (
                  <option key={r} value={r}>
                    {'★'.repeat(r)} {r}/5
                  </option>
                ))}
              </select>
              <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                <span className='material-symbols-outlined text-text-secondary text-[18px]'>
                  expand_more
                </span>
              </div>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className='relative w-40'>
                <select
                  className='block w-full pl-3 pr-8 py-2 bg-surface-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                >
                  <option value=''>All tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                  <span className='material-symbols-outlined text-text-secondary text-[18px]'>
                    expand_more
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {analyzedGames.length === 0 ? (
          <div className='py-16 text-center text-text-secondary bg-surface-dark rounded-2xl border border-dashed border-border-dark'>
            <span className='material-symbols-outlined text-[48px] text-text-secondary/20 block mb-3'>
              edit_note
            </span>
            <p className='text-base font-medium text-white/60'>
              No analyses written yet
            </p>
            <p className='text-sm mt-1'>
              Open any game in your library and fill in the Analysis Notes to
              start building your research library.
            </p>
          </div>
        ) : filteredAnalyzed.length === 0 ? (
          <div className='py-10 text-center text-text-secondary bg-surface-dark rounded-2xl border border-border-dark'>
            <span className='material-symbols-outlined text-[36px] text-text-secondary/30 block mb-2'>
              search_off
            </span>
            <p className='text-sm'>No analyses match your filters.</p>
            <button
              type='button'
              className='mt-2 text-primary hover:underline text-xs font-semibold'
              onClick={() => {
                setSearchText('');
                setRatingFilter('');
                setTagFilter('');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
            {filteredAnalyzed.map(game => (
              <AnalysisCard
                key={game.id}
                game={game}
                onClick={() => handleOpenGame(game)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────── */}
      <EditGameModal
        open={isModalOpen}
        game={selectedGame}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleUpdateGame}
        onDelete={handleDeleteGame}
        isAnalysisFlow={true}
      />

      {/* ── Add game modal ────────────────────────────────────────── */}
      <AddToBoardModal
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onGameAdded={fetchData}
        defaultStatus='analysis_needed'
      />
    </div>
  );
};

export default AnalysisPage;
