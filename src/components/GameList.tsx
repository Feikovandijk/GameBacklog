import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGames } from '../hooks/useGames';
import { useAuth } from '../contexts/AuthContext';
import { Game } from '../types/game';

export const GameList: React.FC = () => {
  const navigate = useNavigate();
  const { games } = useGames();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Game Backlog</h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">Welcome, {user?.displayName}</span>
              <button
                onClick={() => navigate('/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-4"
              >
                Add Game
              </button>
              <button
                onClick={() => logout()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game: Game) => (
            <div
              key={game.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">{game.title}</h3>
                <p className="mt-2 text-gray-600">{game.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Added: {new Date(game.dateAdded).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {game.status}
                  </span>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => navigate(`/edit/${game.id}`)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}; 