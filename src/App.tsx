import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Game } from './types/game';
import { GameModal } from './components/GameModal';
import { Dashboard } from './components/Dashboard';
import { TopBar } from './components/TopBar';
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
      <div className="flex flex-col h-screen bg-gray-900 text-gray-300">
        <TopBar onAddGame={() => handleOpenModal()} />
          <main className="flex-1 p-8 overflow-y-auto">
            {!user ? (
              <div className="text-center text-gray-400">
                <p>Please log in to manage your game backlog.</p>
              </div>
            ) : <Outlet />}
          </main>
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