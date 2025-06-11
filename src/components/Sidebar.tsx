import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  UserCircle, 
  Heart,
  MessageSquare,
  LogIn,
  Plus,
  List,
  Download,
  Star,
  ExternalLink,
  Library,
  FileUp
} from 'lucide-react';
import { Game } from '../types/game';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  const [steamId, setSteamId] = useLocalStorage<string | null>('steamId', null);

  const handleSteamLogin = () => {
    // The auth worker will handle the callback and redirect back to our app.
    const returnTo = `https://game-backlog-auth-worker.feikovandijk.workers.dev/`;

    const openIdParams = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': returnTo,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    const steamLoginUrl = `https://steamcommunity.com/openid/login?${openIdParams.toString()}`;

    window.location.href = steamLoginUrl;
  };

  const handleImportWishlist = async () => {
    if (!steamId) {
      alert('Please log in with Steam first.');
      return;
    }

    try {
      const workerUrl = `https://game-backlog-wishlist-worker.feikovandijk.workers.dev?steamId=${steamId}`;
      const response = await fetch(workerUrl);

      if (!response.ok) {
        if (response.status === 403) {
          const privacySettingsUrl = 'https://steamcommunity.com/my/edit/settings';
          alert(`Could not import wishlist. This usually means your Steam profile is private.\n\nPlease ensure your "Game Details" are set to "Public" in your Steam privacy settings and try again.\n\nYou can find your settings here: ${privacySettingsUrl}`);
          // Open in new tab for convenience
          window.open(privacySettingsUrl, '_blank');
          return;
        }
        throw new Error(`Failed to fetch wishlist. Status: ${response.status}`);
      }

      const newGamesFromServer = await response.json();

      if (Array.isArray(newGamesFromServer) && newGamesFromServer.length > 0) {
        const now = new Date().toISOString();
        const newGames: Game[] = newGamesFromServer.map((game: Partial<Game>) => ({
          id: game.id || String(Math.random()), // The worker provides 'id' as a string
          title: game.title || 'Unknown Title',
          platform: 'PC',
          status: 'Unplayed',
          ownership: 'Wishlist',
          dateAdded: now,
          dateModified: now,
          rating: 0,
          playtime: 0,
          genre: game.genre || '',
          priority: false,
          notes: game.notes || '',
        }));

        setGames(prevGames => {
          const existingIds = new Set(prevGames.map(g => g.id));
          const uniqueNewGames = newGames.filter(g => !existingIds.has(g.id));
          return [...prevGames, ...uniqueNewGames];
        });

        alert(`Successfully imported ${newGames.length} games from your wishlist.`);
      } else {
        alert('No new games found on your wishlist, or the data was in an unexpected format.');
      }
    } catch (error) {
      console.error('Error importing Steam wishlist:', error);
      alert('An error occurred while importing the wishlist.');
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
      </div>

      <div>
        {steamId ? (
          <NavItem icon={<FileUp size={20} />} onClick={handleImportWishlist}>
            Import Wishlist
          </NavItem>
        ) : (
          <NavItem icon={<LogIn size={20} />} onClick={handleSteamLogin}>
            Login with Steam
          </NavItem>
        )}
        <NavItem icon={<Settings size={20} />}>Settings</NavItem>
      </div>
    </aside>
  );
}; 