import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import StatusBadge from '../shared/StatusBadge';

interface ColumnStats {
  totalHours: number;
  avgRating: number;
  favoriteCount: number;
}

interface BoardColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClear: () => void;
  columnStats?: ColumnStats;
}

const BoardColumn: React.FC<BoardColumnProps> = ({
  id,
  title,
  children,
  onClear,
  columnStats,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const count = React.Children.count(children);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const hasStats =
    columnStats &&
    (columnStats.totalHours > 0 ||
      columnStats.avgRating > 0 ||
      columnStats.favoriteCount > 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-[300px] flex-shrink-0 flex flex-col h-full rounded-xl transition-colors duration-200 ${
        isOver
          ? 'bg-white/[0.08] ring-1 ring-primary/30'
          : 'bg-white/[0.03]'
      }`}
    >
      {/* Header */}
      <div className='px-3 pt-3 pb-2 flex-shrink-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <StatusBadge
              status={id}
              minimal
              className='w-2.5 h-2.5'
            />
            <h2 className='font-bold text-white text-sm'>{title}</h2>
            <span className='bg-primary/10 rounded-full px-2 py-0.5 text-sm text-primary font-bold min-w-[28px] text-center'>
              {count}
            </span>
          </div>

          {/* Three-dot menu */}
          {count > 0 && (
            <div className='relative' ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-1 rounded-lg transition-colors ${
                  menuOpen
                    ? 'bg-white/10 text-white'
                    : 'text-text-secondary/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className='material-symbols-outlined text-[16px]'>
                  more_horiz
                </span>
              </button>

              {menuOpen && (
                <div className='absolute right-0 top-full mt-1 w-44 bg-surface-dark border border-border-dark rounded-xl shadow-2xl z-20 py-1'>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onClear();
                    }}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors'
                  >
                    <span className='material-symbols-outlined text-[16px]'>
                      delete_sweep
                    </span>
                    Clear column
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        {hasStats && (
          <div className='flex items-center gap-3 mt-1.5 text-[10px] text-text-secondary'>
            {columnStats.totalHours > 0 && (
              <span className='flex items-center gap-0.5'>
                <span className='material-symbols-outlined text-[10px]'>
                  schedule
                </span>
                {columnStats.totalHours.toFixed(0)}h total
              </span>
            )}
            {columnStats.avgRating > 0 && (
              <span className='flex items-center gap-0.5'>
                <span
                  className='material-symbols-outlined text-[10px] text-accent-yellow'
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                {columnStats.avgRating.toFixed(1)} avg
              </span>
            )}
            {columnStats.favoriteCount > 0 && (
              <span className='flex items-center gap-0.5'>
                <span
                  className='material-symbols-outlined text-[10px] text-red-500'
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                {columnStats.favoriteCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className='flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2 min-h-[100px] kanban-scroll'>
        {children}
        {count === 0 && (
          <div className='flex-1 flex flex-col items-center justify-center text-text-secondary/50 py-12 gap-2'>
            <span className='material-symbols-outlined text-[32px]'>
              add_circle
            </span>
            <span className='text-xs font-medium'>Drag games here</span>
            <span className='text-[10px]'>
              or use + to add from library
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
