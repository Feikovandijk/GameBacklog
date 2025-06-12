import React from 'react';
import { Game } from '../types/game';

interface DashboardProps {
  games: Game[];
}

const mockAchievements = (game: Game) => {
  // For demo: randomize achievements if not present
  if (game.achievements) return game.achievements;
  const total = Math.floor(Math.random() * 50) + 10;
  const unlocked = Math.floor(Math.random() * total);
  return {
    unlocked,
    total,
    percent: total ? Math.round((unlocked / total) * 100) : 0,
    lastUnlocked: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
};

const formatDate = (iso: string | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const GameCard: React.FC<{ game: Game }> = ({ game }) => {
  const ach = mockAchievements(game);
  return (
    <div className="bg-[#232b32] rounded-lg shadow-md p-4 flex flex-col gap-2 border border-gray-800 hover:border-indigo-500 transition">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">{game.title}</h3>
          <div className="text-xs text-gray-400 mt-1">{game.platform}</div>
        </div>
        <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200 capitalize font-semibold">{game.status}</span>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold text-indigo-400">{ach.unlocked}</span>
          <span className="text-xs text-gray-400">Unlocked</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold text-gray-400">/ {ach.total}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold text-green-400">{ach.percent}%</span>
          <span className="text-xs text-gray-400">Complete</span>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
        <span>Last Ach.: {formatDate(ach.lastUnlocked)}</span>
        <span>Playtime: {Math.round(game.playtime || 0)}h</span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  if (!games.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No games in your backlog.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {games.map(game => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}; 