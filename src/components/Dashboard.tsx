import React, { useState, useMemo } from 'react';
import { Game } from '../types/game';
import { useGames } from '../contexts/GamesContext';
import { Plus, Target, Trash2, Star, CheckCircle, Gamepad2, List, Award, BarChart2, PieChart } from 'lucide-react';
import { GameModal } from './GameModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const RecentPlaytimeChart: React.FC<{ games: Game[] }> = ({ games }) => {
  const data = games
    .filter(g => g.playtime2Weeks && g.playtime2Weeks > 0)
    .map(g => ({
      name: g.title,
      'Hours': parseFloat((g.playtime2Weeks! / 60).toFixed(1)),
    }))
    .sort((a, b) => b.Hours - a.Hours);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" stroke="#888" />
        <YAxis type="category" dataKey="name" stroke="#888" width={100} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#232b32', border: '1px solid #4a5568' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
        <Bar dataKey="Hours" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const GenrePopularityChart: React.FC<{ games: Game[] }> = ({ games }) => {
  const genreData = useMemo(() => {
    const genres: { [key: string]: number } = {};
    games.forEach(game => {
      if (game.genre) {
        const gameGenres = game.genre.split(',').map(g => g.trim());
        gameGenres.forEach(genre => {
          if (genre) {
            genres[genre] = (genres[genre] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(genres)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [games]);

  if (genreData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
          {genreData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#232b32', border: '1px solid #4a5568' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-[#232b32] p-4 rounded-lg flex items-center gap-4 border border-gray-700">
    <div className={`p-3 rounded-md ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const PlaytimeGoal: React.FC<{ game: Game }> = ({ game }) => {
  const { saveGame } = useGames();
  const [goal, setGoal] = useState(game.playtimeGoal || '');

  const progress = game.playtimeGoal ? Math.min((game.playtime / game.playtimeGoal) * 100, 100) : 0;

  const handleSetGoal = () => {
    const newGoal = parseInt(String(goal), 10);
    if (!isNaN(newGoal) && newGoal > 0) {
      saveGame({ ...game, playtimeGoal: newGoal }, game);
    }
  };
  
  const handleClearGoal = () => {
    setGoal('');
    saveGame({ ...game, playtimeGoal: undefined }, game);
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex-grow bg-gray-700 rounded-full h-2.5">
        <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="w-28 text-right text-gray-300">
        {game.playtime} / {game.playtimeGoal || '??'}h
      </div>
      <input 
        type="number"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        onBlur={handleSetGoal}
        onKeyDown={(e) => e.key === 'Enter' && handleSetGoal()}
        className="w-20 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-white"
        placeholder="Goal"
      />
      {game.playtimeGoal && (
        <button onClick={handleClearGoal} className="text-gray-500 hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { games, saveGame } = useGames();
  const [gameToAddToPriority, setGameToAddToPriority] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>(undefined);

  const priorityGames = useMemo(() => games.filter(g => g.priority), [games]);
  const nonPriorityGames = useMemo(() => games.filter(g => !g.priority), [games]);
  
  const stats = useMemo(() => ({
    totalGames: games.length,
    completed: games.filter(g => g.status === 'completed' || g.status === 'beaten').length,
    playing: games.filter(g => g.status === 'playing').length,
    totalAchievements: games.reduce((acc, game) => acc + (game.achievements?.unlocked || 0), 0),
  }), [games]);

  const handleAddPriority = () => {
    const game = games.find(g => g.id === gameToAddToPriority);
    if (game) {
      saveGame({ ...game, priority: true }, game);
      setGameToAddToPriority('');
    }
  };
  
  const handleRemovePriority = (game: Game) => {
    saveGame({ ...game, priority: false }, game);
  };

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, steamAppId?: string) => {
    saveGame(gameData, editingGame || null, steamAppId);
    setModalOpen(false);
    setEditingGame(undefined);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };

  const handleAddNewGame = () => {
    setEditingGame(undefined);
    setModalOpen(true);
  };

  return (
    <div className="bg-[#1b232a] min-h-screen text-gray-200 font-sans p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Priority List */}
          <div className="bg-[#232b32] p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Star className="text-yellow-400" /> Priority List
            </h2>
            <div className="space-y-4">
              {priorityGames.map(game => (
                <div key={game.id} className="p-3 bg-gray-900/50 rounded-md flex justify-between items-center">
                  <div className="cursor-pointer" onClick={() => handleEditGame(game)}>
                    <p className="font-semibold text-white">{game.title}</p>
                    <p className="text-xs text-gray-400">{game.platform}</p>
                  </div>
                  <button onClick={() => handleRemovePriority(game)} className="text-gray-500 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <select 
                  value={gameToAddToPriority}
                  onChange={(e) => setGameToAddToPriority(e.target.value)}
                  className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-white"
                >
                  <option value="">Select a game to add...</option>
                  {nonPriorityGames.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <button onClick={handleAddPriority} disabled={!gameToAddToPriority} className="bg-indigo-600 px-3 py-1 rounded-md text-white font-semibold disabled:bg-gray-600">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Playtime Goals */}
          {priorityGames.length > 0 && (
            <div className="bg-[#232b32] p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Target className="text-indigo-400" /> Playtime Goals
              </h2>
              <div className="space-y-4">
                {priorityGames.map(game => (
                  <div key={game.id}>
                     <p className="font-semibold text-white mb-2 cursor-pointer hover:text-indigo-400" onClick={() => handleEditGame(game)}>{game.title}</p>
                     <PlaytimeGoal game={game} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Playtime */}
          <div className="bg-[#232b32] p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <BarChart2 className="text-blue-400" /> Recent Playtime (2 weeks) (Not working, WIP)
            </h2>
            <RecentPlaytimeChart games={games} />
          </div>

          {/* Genre Popularity */}
          <div className="bg-[#232b32] p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <PieChart className="text-green-400" /> Genre Popularity
            </h2>
            <GenrePopularityChart games={games} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-[#232b32] p-6 rounded-lg border border-gray-700">
             <h2 className="text-xl font-bold text-white mb-4">At a Glance</h2>
             <div className="space-y-4">
                <StatCard icon={<List className="w-6 h-6 text-blue-300"/>} label="Total Games" value={stats.totalGames} color="bg-blue-500/20" />
                <StatCard icon={<Gamepad2 className="w-6 h-6 text-yellow-300"/>} label="Currently Playing" value={stats.playing} color="bg-yellow-500/20" />
                <StatCard icon={<CheckCircle className="w-6 h-6 text-green-300"/>} label="Completed" value={stats.completed} color="bg-green-500/20" />
                <StatCard icon={<Award className="w-6 h-6 text-orange-300"/>} label="Achievements Unlocked" value={stats.totalAchievements.toLocaleString()} color="bg-orange-500/20" />
             </div>
          </div>
          <button
            onClick={handleAddNewGame}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add New Game
          </button>
        </div>
      </div>
      {isModalOpen && (
        <GameModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveGame}
          game={editingGame}
          title={editingGame ? 'Edit Game' : 'Add a New Game'}
        />
      )}
    </div>
  );
}; 