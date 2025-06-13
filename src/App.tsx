import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Game } from './types/game';
import { GameModal } from './components/GameModal';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GamesProvider, useGames } from './contexts/GamesContext';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Achievements from './pages/Achievements';
import Wishlist from './pages/Wishlist';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { saveGame } = useGames();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>();

  const handleOpenModal = (game?: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, steamAppId?: string) => {
    saveGame(gameData, editingGame || null, steamAppId);
  };

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-gray-300">
        <Sidebar onAddGame={() => handleOpenModal()} />
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
            {!user ? (
              <div className="text-center text-gray-400">
                <p>Please log in to manage your game backlog.</p>
              </div>
            ) : <Outlet />}
          </main>
        </div>
      </div>
      {isModalOpen && (
        <GameModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingGame(undefined);
          }}
          onSave={handleSaveGame}
          game={editingGame}
          title={editingGame ? 'Edit Game' : 'Add Game'}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <GamesProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/wishlist" element={<Wishlist />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GamesProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;