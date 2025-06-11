import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  UserCircle, 
  Heart,
  MessageSquare,
  Download
} from 'lucide-react';
import { Game } from '../types/game';

const NavItem = ({ icon, children, onClick }: { icon: React.ReactNode, children: React.ReactNode, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left">
    {icon}
    <span className="ml-3">{children}</span>
  </button>
);

interface SidebarProps {
  onAddGame: () => void;
  setGames: React.Dispatch<React.SetStateAction<Game[]>>;
  setFilter: (filter: 'all' | 'wishlist') => void;
}

export const Sidebar = ({ onAddGame, setGames, setFilter }: SidebarProps) => {
  const [steamId, setSteamId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleWishlistImport = async () => {
    if (!steamId) {
      alert('Please enter a Steam ID.');
      return;
    }
    setIsLoading(true);
    const workerUrl = `https://game-backlog-wishlist-importer.feikovandijk.workers.dev`;

    try {
      const response = await fetch(`${workerUrl}?steamId=${steamId}`);

      if (!response.ok) {
        throw new Error(`The server responded with status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }
      
      if (typeof data !== 'object' || data === null) {
        throw new Error('Parsed data is not a valid object.');
      }

      if (Object.keys(data).length === 0) {
        alert('Your wishlist is empty or could not be loaded.');
        return;
      }

      const appIds = Object.keys(data);
      const now = new Date().toISOString();
      const newGames: Game[] = appIds.map(appId => {
        const gameData = data[appId];
        return {
          id: appId,
          title: gameData.name,
          platform: 'PC',
          genre: gameData.tags?.join(', ') || '',
          status: 'Unplayed',
          ownership: 'Wishlist',
          priority: gameData.priority > 0,
          notes: '',
          dateAdded: now,
          dateModified: now,
        };
      });

      setGames(prevGames => {
        const existingAppIds = new Set(prevGames.map(g => g.id));
        const trulyNewGames = newGames.filter(g => !existingAppIds.has(g.id));
        return [...prevGames, ...trulyNewGames];
      });

      alert(`Imported ${newGames.length} games from your wishlist!`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      alert(`An error occurred while importing: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-4 mb-10">
          <UserCircle size={40} className="text-white" />
          <div>
            <h2 className="font-semibold text-white">Backlog</h2>
            <p className="text-sm text-gray-400">gamer@email.com</p>
          </div>
        </div>

        <nav className="space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} onClick={() => setFilter('all')}>Dashboard</NavItem>
          <NavItem icon={<PlusCircle size={20} />} onClick={onAddGame}>Add Game</NavItem>
          <NavItem icon={<Heart size={20} />} onClick={() => setFilter('wishlist')}>Wishlist</NavItem>
          <NavItem icon={<MessageSquare size={20} />}>Reviews</NavItem>
        </nav>
        
        <div className="mt-6 border-t border-gray-700 pt-6">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Import</h3>
          <div className="mt-2 space-y-2">
            <div className="px-4">
              <label htmlFor="steamId" className="block text-xs text-gray-400 mb-1">Steam ID</label>
              <input 
                type="text" 
                id="steamId"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="Enter your 64-bit Steam ID"
                className="w-full bg-gray-700 text-white text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <NavItem icon={<Download size={20} />} onClick={handleWishlistImport}>
              {isLoading ? 'Importing...' : 'Import Wishlist'}
            </NavItem>
          </div>
        </div>
      </div>

      <div>
        <NavItem icon={<Settings size={20} />}>Settings</NavItem>
      </div>
    </aside>
  );
}; 