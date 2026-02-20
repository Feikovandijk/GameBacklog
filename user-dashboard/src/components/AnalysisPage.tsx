import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { userGamesAPI } from '../services/api';
import type { UserGame } from '../services/api';
import AddToBoardModal from './AddToBoardModal';
import StatusBadge from './shared/StatusBadge';
import StarRating from './shared/StarRating';
import TagInput from './shared/TagInput';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const getImageSrc = (game: UserGame) =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`;

/* ─── Analysis card ───────────────────────────────────────────────────────── */

interface LibraryListItemProps {
  game: UserGame;
  isSelected?: boolean;
  onClick: () => void;
}

const LibraryListItem: React.FC<LibraryListItemProps> = ({ game, isSelected, onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type='button'
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all group ${isSelected
        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5'
        : 'bg-surface-dark border-border-dark hover:border-primary/40'
        }`}
    >
      <div className='relative w-20 h-12 rounded-lg overflow-hidden bg-background-dark flex-shrink-0'>
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
        <h4 className={`font-semibold text-sm truncate transition-colors ${isSelected ? 'text-primary' : 'text-white group-hover:text-primary'}`}>
          {game.game?.name || 'Unknown Game'}
        </h4>
        <div className='flex items-center gap-2 mt-1 text-xs text-text-secondary'>
          {game.user_rating !== undefined && (
            <span className='flex items-center gap-0.5 text-yellow-400'>
              <span className='material-symbols-outlined text-[12px]' style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {game.user_rating}
            </span>
          )}
          {(game.hours_played ?? 0) > 0 && (
            <span className='flex items-center gap-0.5'>
              <span className='material-symbols-outlined text-[12px]'>schedule</span>
              {game.hours_played!.toFixed(1)}h
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

interface AnalysisDetailEditorProps {
  game: UserGame;
  onSave: (values: Partial<UserGame>) => Promise<void>;
  onDelete: () => Promise<void>;
}

const AnalysisDetailEditor: React.FC<AnalysisDetailEditorProps> = ({ game, onSave, onDelete }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [formData, setFormData] = useState<Partial<UserGame>>(game);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setFormData(game);
  }, [game]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this game from your list?')) {
      setIsDeleting(true);
      await onDelete();
      setIsDeleting(false);
    }
  };

  const borderColors = [
    'focus:border-green-500/50 focus:ring-green-500/50',
    'focus:border-red-500/50 focus:ring-red-500/50',
    'focus:border-primary focus:ring-primary',
  ];

  let analysisTemplate = [
    'What worked well (To Steal)',
    "What didn't work (To Avoid)",
    'Takeaways for our game',
  ];
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.analysis_template && Array.isArray(parsed.analysis_template) && parsed.analysis_template.length > 0) {
        analysisTemplate = parsed.analysis_template;
      }
    }
  } catch (e) { }

  return (
    <div className='h-full flex flex-col'>
      {/* Header Sticky */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-border-dark bg-surface-dark gap-4'>
        <div className='flex items-center gap-4 min-w-0'>
          <div className='w-16 h-10 rounded-lg overflow-hidden bg-background-dark flex-shrink-0 border border-border-dark shadow-md'>
            {!imgFailed ? (
              <img
                src={getImageSrc(game)}
                alt={game.game?.name}
                className='w-full h-full object-cover'
                loading='lazy'
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center'>
                <span className='material-symbols-outlined text-[20px] text-text-secondary/30'>sports_esports</span>
              </div>
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-xl font-bold text-white leading-tight truncate' title={game.game?.name}>
              {game.game?.name || 'Unknown Game'}
            </h2>
            <div className='flex items-center gap-2 mt-1'>
              <StatusBadge status={formData.status || 'want_to_play'} />
              {(formData.hours_played ?? 0) > 0 && (
                <span className='text-xs text-text-secondary'>{formData.hours_played}h played</span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          <button
            type='button'
            onClick={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
            className='p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10'
            title={formData.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span
              className={`material-symbols-outlined text-[24px] transition-colors ${formData.is_favorite ? 'text-red-500' : 'text-text-secondary'}`}
              style={{ fontVariationSettings: formData.is_favorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
          <button
            type='button'
            onClick={handleDelete}
            disabled={isDeleting}
            className='p-2 rounded-xl text-red-500/70 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors'
            title='Delete game'
          >
            <span className='material-symbols-outlined text-[24px]'>delete</span>
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className='px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background-dark font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2'
          >
            <span className='material-symbols-outlined text-[18px]'>save</span>
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-6'>
        <form id='edit-analysis-form' onSubmit={handleSubmit} className='space-y-8 max-w-4xl mx-auto'>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>Status</label>
              <div className='relative'>
                <select
                  className='block w-full pl-3 pr-10 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as UserGame['status'] }))}
                  required
                >
                  <option value='want_to_play'>Want to Play</option>
                  <option value='currently_playing'>Currently Playing</option>
                  <option value='analysis_needed'>Analysis Needed</option>
                  <option value='completed'>Completed</option>
                  <option value='completed_100'>100% Completed</option>
                  <option value='on_hold'>On Hold</option>
                  <option value='dropped'>Dropped</option>
                </select>
                <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                  <span className='material-symbols-outlined text-text-secondary text-[20px]'>expand_more</span>
                </div>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>Your Rating</label>
              <div className='pt-1'>
                <StarRating
                  value={formData.user_rating}
                  onChange={val => setFormData(prev => ({ ...prev, user_rating: val }))}
                />
              </div>
            </div>
          </div>

          <hr className='border-border-dark' />

          {/* Section: Guided Deconstruction */}
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <span className='material-symbols-outlined text-primary text-[20px]'>psychology</span>
              <h3 className='text-lg font-bold text-white uppercase tracking-wider'>Guided Deconstruction</h3>
            </div>

            <div className='space-y-6 bg-background-dark p-6 rounded-2xl border border-border-dark shadow-inner md:space-y-5 md:p-5'>
              {analysisTemplate.map((question, index) => {
                const colorClass = borderColors[index % borderColors.length];
                return (
                  <div key={`${index}-${question}`}>
                    <label className='block text-sm font-medium text-text-secondary mb-2'>
                      {question}
                    </label>
                    <textarea
                      rows={5}
                      className={`block w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:ring-1 text-sm resize-y min-h-[100px] shadow-sm ${colorClass}`}
                      placeholder='Your thoughts...'
                      value={formData.analysis?.[question] || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          analysis: { ...prev.analysis, [question]: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}

              <div className='mt-2'>
                <label className='block text-sm font-medium text-text-secondary mb-2'>
                  External Document Link (Optional)
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <span className='material-symbols-outlined text-text-secondary text-[16px]'>link</span>
                  </div>
                  <input
                    type='url'
                    className='block w-full pl-9 pr-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm'
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
          </div>

          {/* Section: Extra Notes */}
          <div>
            <div className='flex items-center gap-2 mb-3 mt-4'>
              <span className='material-symbols-outlined text-[20px]'>edit_note</span>
              <h3 className='text-lg font-bold text-white uppercase tracking-wider'>Other Notes</h3>
            </div>
            <textarea
              rows={8}
              className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-y min-h-[160px] shadow-sm'
              placeholder='Document competitive analysis, design patterns, mechanics worth studying...'
              value={formData.user_notes || ''}
              onChange={e =>
                setFormData(prev => ({ ...prev, user_notes: e.target.value }))
              }
            />
          </div>

          {/* Section: Research Tags */}
          <div className='pb-4'>
            <div className='flex items-center gap-2 mb-3'>
              <span className='material-symbols-outlined text-accent-purple text-[20px]'>label</span>
              <h3 className='text-lg font-bold text-white uppercase tracking-wider'>Research Tags</h3>
            </div>
            <TagInput
              tags={formData.user_tags || []}
              onChange={tags => setFormData(prev => ({ ...prev, user_tags: tags }))}
              placeholder='Add research tags (press Enter)...'
            />
          </div>

        </form>
      </div>
    </div>
  );
};


/* ─── Main component ──────────────────────────────────────────────────────── */

const AnalysisPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analyzedGames, setAnalyzedGames] = useState<UserGame[]>([]);
  const [searchText, setSearchText] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | ''>('');
  const [tagFilter, setTagFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAnalyzedGame, setSelectedAnalyzedGame] = useState<UserGame | null>(null);

  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const [queueRes, notesRes] = await Promise.all([
        userGamesAPI.get({ status: 'analysis_needed', limit: 300 }),
        userGamesAPI.get({ has_notes: true, limit: 300 }),
      ]);

      const mergedMap = new Map<string, UserGame>();
      queueRes.data.documents.forEach(g => mergedMap.set(g.id, g));
      notesRes.data.documents.forEach(g => mergedMap.set(g.id, g));

      const allGames = Array.from(mergedMap.values());
      // Sort newest added/updated first
      allGames.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setAnalyzedGames(allGames);
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

  // Sync selectedAnalyzedGame when analyzedGames updates
  useEffect(() => {
    if (selectedAnalyzedGame) {
      const updated = analyzedGames.find(g => g.id === selectedAnalyzedGame.id);
      if (updated) {
        setSelectedAnalyzedGame(updated);
      } else {
        setSelectedAnalyzedGame(null);
      }
    }
  }, [analyzedGames]);

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
          (g.game?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
          (g.user_notes || '').toLowerCase().includes(searchText.toLowerCase());

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
              {analyzedGames.filter(g => g.status === 'analysis_needed').length}
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

      {/* ── Research library ────────────────────────────────────────── */}
      <div>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5'>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <span className='material-symbols-outlined text-primary text-[20px]'>
              menu_book
            </span>
            Analysis & Research
            <span className='text-sm font-normal text-text-secondary ml-1'>
              ({filteredAnalyzed.length}
              {filteredAnalyzed.length !== analyzedGames.length &&
                ` of ${analyzedGames.length}`}
              )
            </span>
          </h2>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => setShowAddModal(true)}
              className='flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange border border-accent-orange/20 rounded-xl transition-all text-sm font-bold flex-shrink-0'
            >
              <span className='material-symbols-outlined text-[18px]'>add</span>
              Add Game
            </button>
          </div>
        </div>

        <div className='flex flex-wrap gap-2 w-full md:w-auto mb-4 bg-surface-dark p-3 rounded-2xl border border-border-dark'>
          {/* Search */}
          <div className='relative flex-1 md:flex-none md:w-60 min-w-[200px]'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <span className='material-symbols-outlined text-text-secondary text-[18px]'>
                search
              </span>
            </div>
            <input
              type='text'
              className='block w-full pl-9 pr-3 py-2 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
              placeholder='Search notes or title…'
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* Rating filter */}
          <div className='relative w-36'>
            <select
              className='block w-full pl-3 pr-8 py-2 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
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
                className='block w-full pl-3 pr-8 py-2 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
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

        {analyzedGames.length === 0 ? (
          <div className='py-16 text-center text-text-secondary bg-surface-dark rounded-2xl border border-dashed border-border-dark'>
            <span className='material-symbols-outlined text-[48px] text-text-secondary/20 block mb-3'>
              edit_note
            </span>
            <p className='text-base font-medium text-white/60'>
              No analyses written yet
            </p>
            <p className='text-sm mt-1'>
              Add a game and fill in the Analysis Notes to
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
          <div className='flex flex-col lg:flex-row gap-6 h-[700px]'>
            {/* Master List */}
            <div className='w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2'>
              {filteredAnalyzed.map(game => (
                <LibraryListItem
                  key={game.id}
                  game={game}
                  isSelected={selectedAnalyzedGame?.id === game.id}
                  onClick={() => setSelectedAnalyzedGame(game)}
                />
              ))}
            </div>

            {/* Detail Pane */}
            <div className='w-full lg:w-2/3 bg-surface-dark border border-border-dark rounded-2xl overflow-hidden'>
              {selectedAnalyzedGame ? (
                <AnalysisDetailEditor
                  game={selectedAnalyzedGame}
                  onSave={async (values) => {
                    if (!selectedAnalyzedGame) return;
                    try {
                      await userGamesAPI.updateGame(selectedAnalyzedGame.id, values);
                      fetchData();
                    } catch (e) {
                      console.error("Failed to update game", e);
                    }
                  }}
                  onDelete={async () => {
                    if (!selectedAnalyzedGame) return;
                    try {
                      await userGamesAPI.removeGame(selectedAnalyzedGame.id);
                      setSelectedAnalyzedGame(null);
                      fetchData();
                    } catch (e) {
                      console.error("Failed to delete game", e);
                    }
                  }}
                />
              ) : (
                <div className='h-full flex flex-col items-center justify-center text-text-secondary p-6'>
                  <span className='material-symbols-outlined text-[48px] text-text-secondary/20 mb-4 block'>
                    touch_app
                  </span>
                  <p className='text-white/60 font-medium text-lg'>Select a game</p>
                  <p className='text-sm mt-1 text-center max-w-sm'>
                    Click on a game from the list to view its full analysis notes and details here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add game modal ────────────────────────────────────────── */}
      <AddToBoardModal
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onGameAdded={fetchData}
        defaultStatus='analysis_needed'
        hideColumnSelect={true}
        modalTitle='Add a Game to Analyse'
      />
    </div>
  );
};

export default AnalysisPage;
