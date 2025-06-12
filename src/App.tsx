import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Game } from './types/game';
import { GameModal } from './components/GameModal';
import { GameTable } from './components/GameTable';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GamesProvider, useGames } from './contexts/GamesContext';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { games, saveGame, deleteGame, stats } = useGames();
  const [view, setView] = useState<'dashboard' | 'kanban' | 'wishlist'>('kanban');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>();

  const handleOpenModal = (game?: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>) => {
    saveGame(gameData, editingGame || null);
  };

  const filteredGames = React.useMemo(() => {
    if (view === 'wishlist') {
      return games.filter(game => game.ownership === 'wishlist');
    }
    // For kanban, we want all non-wishlist items. For dashboard, all items.
    // The components will handle their specific filtering.
    return games;
  }, [games, view]);

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-gray-300">
        <Sidebar
          setView={setView}
          onAddGame={() => handleOpenModal()}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center">
            <input type="text" placeholder="Search..." className="bg-gray-700 text-sm rounded-lg px-4 py-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                disabled={!user}
              >
                Add Game
              </button>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-y-auto">
            {!user && (
              <div className="text-center text-gray-400">
                <p>Please log in to manage your game backlog.</p>
              </div>
            )}
            {user && (
              <>
                {(view === 'dashboard' || view === 'wishlist') && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="col-span-1">
                      <Dashboard games={filteredGames} />
                    </div>
                    <div className="col-span-1">
                      <GameTable
                        games={filteredGames}
                        onEdit={handleOpenModal}
                        onDelete={deleteGame}
                      />
                    </div>
                  </div>
                )}
                {view === 'kanban' && <KanbanBoard />}
              </>
            )}
          </main>
        </div>
      </div>
      <GameModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveGame}
        game={editingGame}
        title={editingGame ? 'Edit Game' : 'Add Game'}
      />
    </>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <GamesProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<AppContent />} />
          </Routes>
        </GamesProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;