import React from 'react';
import StatusBadge, { type GameStatus } from '../shared/StatusBadge';
import type { UserGame } from '../../services/api';

interface BoardStatsBarProps {
  games: UserGame[];
  columns: { id: GameStatus; title: string }[];
  onAddGame: () => void;
}

const BoardStatsBar: React.FC<BoardStatsBarProps> = ({
  games,
  columns,
  onAddGame,
}) => {
  return (
    <div className='px-6 pt-5 pb-2 flex items-center justify-between gap-4'>
      <h1 className='text-2xl font-bold text-white whitespace-nowrap'>
        Active Analysis
      </h1>

      <div className='hidden md:flex items-center gap-3 overflow-x-auto no-scrollbar'>
        {columns.map((col, i) => {
          const count = games.filter(g => g.status === col.id).length;
          return (
            <React.Fragment key={col.id}>
              {i > 0 && <div className='w-px h-4 bg-border-dark flex-shrink-0' />}
              <div className='flex items-center gap-1.5 whitespace-nowrap'>
                <StatusBadge
                  status={col.id}
                  minimal
                  className='w-2 h-2'
                />
                <span className='text-white font-bold text-sm'>{count}</span>
                <span className='text-text-secondary text-sm'>{col.title}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <button
        onClick={onAddGame}
        className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0'
      >
        <span className='material-symbols-outlined text-[18px]'>add</span>
        Add Game
      </button>
    </div>
  );
};

export default BoardStatsBar;
