import React, { useState, useRef, useEffect } from 'react';
import StatusBadge, { type GameStatus } from '../shared/StatusBadge';

interface BoardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  availableTags: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  visibleSecondary: Set<GameStatus>;
  onToggleColumn: (status: GameStatus) => void;
  secondaryColumns: { id: GameStatus; title: string }[];
  secondaryCounts: Record<string, number>;
}

const BoardToolbar: React.FC<BoardToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  availableTags,
  sortBy,
  onSortChange,
  visibleSecondary,
  onToggleColumn,
  secondaryColumns,
  secondaryCounts,
}) => {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
    };
    if (columnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnMenuOpen]);

  return (
    <div className='mx-6 mb-3 flex items-center gap-3 bg-surface-dark/50 border border-border-dark rounded-xl px-3 py-2.5'>
      {/* Search */}
      <div className='relative flex-shrink-0 w-48'>
        <span className='absolute left-2.5 top-1/2 -translate-y-1/2'>
          <span className='material-symbols-outlined text-[16px] text-text-secondary'>
            search
          </span>
        </span>
        <input
          type='text'
          className='w-full pl-8 pr-7 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-sm placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
          placeholder='Search board...'
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white'
          >
            <span className='material-symbols-outlined text-[14px]'>
              close
            </span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className='w-px h-6 bg-border-dark flex-shrink-0' />

      {/* Genre pills */}
      <div className='flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar'>
        <button
          onClick={() => onTagChange(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            !selectedTag
              ? 'bg-primary text-background-dark'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          All
        </button>
        {availableTags.map(tag => (
          <button
            key={tag}
            onClick={() => onTagChange(tag)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedTag === tag
                ? 'bg-primary text-background-dark'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className='w-px h-6 bg-border-dark flex-shrink-0' />

      {/* Sort */}
      <div className='relative flex-shrink-0'>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className='appearance-none pl-3 pr-8 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer'
        >
          <option value='default'>Default</option>
          <option value='priority_desc'>Priority ↓</option>
          <option value='hours_desc'>Hours ↓</option>
          <option value='hours_asc'>Hours ↑</option>
          <option value='added_desc'>Recent</option>
          <option value='name_asc'>Name A-Z</option>
        </select>
        <span className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none'>
          <span className='material-symbols-outlined text-[14px] text-text-secondary'>
            sort
          </span>
        </span>
      </div>

      {/* Column toggle */}
      <div className='relative flex-shrink-0' ref={menuRef}>
        <button
          onClick={() => setColumnMenuOpen(!columnMenuOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            columnMenuOpen
              ? 'bg-primary/10 text-primary'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
          title='Toggle columns'
        >
          <span className='material-symbols-outlined text-[18px]'>
            view_column
          </span>
        </button>

        {columnMenuOpen && (
          <div className='absolute right-0 top-full mt-2 w-56 bg-surface-dark border border-border-dark rounded-xl shadow-2xl z-20 p-3'>
            <div className='text-xs uppercase tracking-wider text-text-secondary font-semibold mb-2'>
              More Columns
            </div>
            {secondaryColumns.map(col => (
              <label
                key={col.id}
                className='flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors'
              >
                <button
                  type='button'
                  onClick={() => onToggleColumn(col.id)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative flex-shrink-0 ${
                    visibleSecondary.has(col.id)
                      ? 'bg-primary'
                      : 'bg-border-dark'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                      visibleSecondary.has(col.id)
                        ? 'translate-x-[18px]'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <div className='flex items-center gap-2 flex-1'>
                  <StatusBadge
                    status={col.id}
                    minimal
                    className='w-2 h-2'
                  />
                  <span className='text-white text-sm'>{col.title}</span>
                </div>
                <span className='text-text-secondary text-xs'>
                  {secondaryCounts[col.id] || 0}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardToolbar;
