import React, { useMemo, useState, useEffect } from 'react';
import { Game, GameStatus } from './types/game';
import { GameModal } from './components/GameModal';
import { GameTable } from './components/GameTable';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';

const V1_STATUS_MAP: { [key: string]: GameStatus } = {
  'Unplayed': 'To Play',
  'None': 'To Play',
  'Unfinished': 'Playing',
  'Beaten': 'Done',
  'Completed': 'Done',
  'Endless': 'Playing',
};

function App() {
  const [games, setGames] = useLocalStorage<Game[]>('gameBacklog', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>();
  const [view, setView] = useState<'dashboard' | 'kanban' | 'wishlist'>('dashboard');
  const [steamId, setSteamId] = useLocalStorage<string | null>('steamId', null);

  useEffect(() => {
    // Migrate old statuses to new ones
    setGames(prevGames => {
      return prevGames.map(game => {
        if (Object.keys(V1_STATUS_MAP).includes(game.status)) {
          return {
            ...game,
            status: V1_STATUS_MAP[game.status as keyof typeof V1_STATUS_MAP] || 'To Play',
          };
        }
        return game;
      });
    });
  }, []);

  useEffect(() => {
    // This effect runs once on page load to capture the Steam ID from the URL
    const params = new URLSearchParams(window.location.search);
    const steamIdFromUrl = params.get('steamId');
    if (steamIdFromUrl) {
      setSteamId(steamIdFromUrl);
      // Clean the URL to remove the query params
      window.history.replaceState({}, document.title, "/");
    }
  }, [setSteamId]);

  const stats = useMemo(() => {
    const gamesPlayed = games.filter(g => g.status === 'Done').length;
    const gamesToBePlayed = games.filter(g => g.status === 'To Play' || g.status === 'Inbox').length;
    return { gamesPlayed, gamesToBePlayed };
  }, [games]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAddGame = () => {
    setEditingGame(undefined);
    setIsModalOpen(true);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsModalOpen(true);
  };

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>) => {
    const now = new Date().toISOString();
    
    if (editingGame) {
      // Update existing game
      setGames(prevGames => 
        prevGames.map(game => 
          game.id === editingGame.id
            ? { ...gameData, id: editingGame.id, dateAdded: editingGame.dateAdded, dateModified: now }
            : game
        )
      );
    } else {
      // Add new game
      const newGame: Game = {
        ...gameData,
        id: generateId(),
        status: gameData.status || 'Inbox',
        dateAdded: now,
        dateModified: now
      };
      setGames(prevGames => [...prevGames, newGame]);
    }
  };

  const handleDeleteGame = (id: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      setGames(prevGames => prevGames.filter(game => game.id !== id));
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(games, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `game-backlog-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredGames = useMemo(() => {
    if (view === 'wishlist') {
      return games.filter(game => game.ownership === 'Wishlist');
    }
    return games;
  }, [games, view]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-300">
      <Sidebar onAddGame={handleAddGame} setGames={setGames} setView={setView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center">
          <input type="text" placeholder="Search..." className="bg-gray-700 text-sm rounded-lg px-4 py-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex items-center space-x-4">
            {games.length > 0 && (
              <button
                onClick={handleExportData}
                className="px-4 py-2 text-sm rounded-md text-gray-300 hover:text-white transition-colors border border-gray-700 hover:border-gray-600"
              >
                Export
              </button>
            )}
            <button
              onClick={handleAddGame}
              className="px-4 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Add Game
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {(view === 'dashboard' || view === 'wishlist') && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="col-span-1">
                <Dashboard games={filteredGames} />
              </div>
              <div className="col-span-1">
                <GameTable
                  games={filteredGames}
                  onEdit={handleEditGame}
                  onDelete={handleDeleteGame}
                />
              </div>
            </div>
          )}
          {view === 'kanban' && (
            <KanbanBoard games={games} setGames={setGames} />
          )}
        </main>
      </div>

      <GameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGame}
        game={editingGame}
        title={editingGame ? 'Edit Game' : 'Add Game'}
      />
    </div>
  );
}

export default App;