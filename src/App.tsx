import React, { useState } from 'react';
import { Plus, Download, BookOpen } from 'lucide-react';
import { Game } from './types/game';
import { GameModal } from './components/GameModal';
import { GameTable } from './components/GameTable';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [games, setGames] = useLocalStorage<Game[]>('gameBacklog', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>();

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900 mb-2">
                Game Backlog
              </h1>
              <p className="text-gray-500 text-sm font-light">
                Track and analyze your personal game library
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {games.length > 0 && (
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-200 hover:border-gray-300"
                >
                  Export
                </button>
              )}
              <button
                onClick={handleAddGame}
                className="px-4 py-2 text-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                Add Game
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <GameTable 
          games={games}
          onEdit={handleEditGame}
          onDelete={handleDeleteGame}
        />

        {/* Modal */}
        <GameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveGame}
          game={editingGame}
          title={editingGame ? 'Edit Game' : 'Add Game'}
        />
      </div>
    </div>
  );
}

export default App;