import React, { useState } from 'react';
import { Game, GameStatus, GAME_STATUSES } from '../types/game';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface DashboardProps {
  games: Game[];
}

const CircleGauge = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-24 h-24">
      <svg className="w-full h-full" viewBox="0 0 36 36">
        <path
          className="text-gray-700"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  </div>
);

const BacklogStatusItem = ({ count, percentage, status, color }: { count: number, percentage: number, status: string, color: string }) => (
  <div className="flex items-center space-x-3 text-sm">
    <div className={`w-1 h-8 rounded-full`} style={{ backgroundColor: color }}></div>
    <div className="flex-1 flex justify-between">
      <span>{count}</span>
      <span>{status}</span>
      <span className="text-gray-400">{percentage.toFixed(1)}%</span>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  const [showBacklog, setShowBacklog] = useState(true);
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showGenres, setShowGenres] = useState(true);

  const totalGames = games.length;

  const statusCounts = games.reduce((acc, game) => {
    acc[game.status] = (acc[game.status] || 0) + 1;
    return acc;
  }, {} as Record<GameStatus, number>);

  const activeBacklogCount = totalGames - (statusCounts['completed'] || 0);
  const activeBacklogPercentage = totalGames > 0 ? (activeBacklogCount / totalGames) * 100 : 0;
  
  const statusColors: Record<GameStatus, string> = {
    'backlog': '#4ade80', // green-400
    'playing': '#f87171', // red-400
    'completed': '#fbbf24', // amber-400
    'dropped': '#facc15', // yellow-400
    'wishlist': '#c084fc', // purple-400
  };

  const platformCounts = games.reduce((acc, game) => {
    acc[game.platform] = (acc[game.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const platforms = Object.keys(platformCounts).sort((a, b) => platformCounts[b] - platformCounts[a]);
  const maxPlatformCount = Math.max(...Object.values(platformCounts), 1);
  
  const genreCounts = games.reduce((acc, game) => {
    const genres = (game.genre || '').split(',').map(g => g.trim());
    genres.forEach(genre => {
      if (genre) {
        acc[genre] = (acc[genre] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const genres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);

  const SummaryCard = ({ title, show, onToggle, children }: { title: string, show: boolean, onToggle: () => void, children: React.ReactNode }) => (
    <div className="bg-gray-800 rounded-lg text-white">
      <div className="flex justify-between items-center p-4 cursor-pointer" onClick={onToggle}>
        <h2 className="text-lg font-light tracking-widest uppercase">{title}</h2>
        <button className="text-gray-400 hover:text-white">
          {show ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      {show && <div className="p-4 pt-0">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-8">
      <SummaryCard title="Backlog Breakdown" show={showBacklog} onToggle={() => setShowBacklog(!showBacklog)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Gauges */}
          <div className="md:col-span-1 flex flex-col items-center space-y-4">
            <CircleGauge label="Total Games" value={totalGames} />
            <CircleGauge label="2025 Backlog" value={<span>&uarr;{totalGames}</span>} />
          </div>

          {/* Right Status Bars */}
          <div className="md:col-span-2 space-y-2">
            <div className="bg-green-500/30 text-green-50 p-3 rounded">
              <div className="flex justify-between font-bold">
                <span>Active Backlog</span>
                <span>{activeBacklogCount} - {activeBacklogPercentage.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
              {GAME_STATUSES.map(status => (
                <BacklogStatusItem 
                  key={status}
                  count={statusCounts[status] || 0}
                  percentage={totalGames > 0 ? ((statusCounts[status] || 0) / totalGames) * 100 : 0}
                  status={status}
                  color={statusColors[status]}
                />
              ))}
            </div>
          </div>
        </div>
      </SummaryCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="bg-gray-800 p-3 rounded-lg text-sm hover:bg-gray-700 transition-colors">Priorities</button>
        <button className="bg-gray-800 p-3 rounded-lg text-sm hover:bg-gray-700 transition-colors">Wishlist</button>
        <button className="bg-gray-800 p-3 rounded-lg text-sm hover:bg-gray-700 transition-colors">Reviews</button>
        <button className="bg-gray-800 p-3 rounded-lg text-sm hover:bg-gray-700 transition-colors">Backlog Roulette</button>
        <input type="text" placeholder="Search backlog..." className="w-full bg-gray-800 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <SummaryCard title="Platform Summary" show={showPlatforms} onToggle={() => setShowPlatforms(!showPlatforms)}>
        <div className="space-y-2">
          {platforms.map(platform => (
            <div key={platform} className="flex items-center text-sm font-bold">
              <div className="w-1/4 bg-gray-700 p-2 rounded-l-md">{platform}</div>
              <div className="w-3/4 flex items-center bg-gray-700 rounded-r-md">
                <div 
                  className="bg-green-500 p-2 text-black text-right"
                  style={{ width: `${(platformCounts[platform] / maxPlatformCount) * 100}%` }}
                >
                  {platformCounts[platform]}
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 border-t border-gray-700 font-bold text-sm">
            <span>Total {totalGames}</span>
          </div>
        </div>
      </SummaryCard>
      
      <SummaryCard title="Genre Summary" show={showGenres} onToggle={() => setShowGenres(!showGenres)}>
        <div className="space-y-2">
          {genres.map(genre => (
            <div key={genre} className="flex items-center text-sm font-bold">
              <div className="w-1/4 bg-gray-700 p-2 rounded-l-md">{genre}</div>
              <div className="w-3/4 flex items-center bg-gray-700 rounded-r-md">
                <div 
                  className="bg-purple-500 p-2 text-black text-right"
                  style={{ width: `${(genreCounts[genre] / maxGenreCount) * 100}%` }}
                >
                  {genreCounts[genre]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SummaryCard>
    </div>
  );
}; 