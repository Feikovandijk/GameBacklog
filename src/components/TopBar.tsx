import React from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  UserCircle, 
  LogIn,
  LogOut,
  Trash2,
  List,
  PlusCircle,
  Trophy,
  Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGames } from '../contexts/GamesContext';
import { useLocation, useNavigate } from 'react-router-dom';

const NavItem = ({ icon, children, onClick, disabled, isActive }: { icon: React.ReactNode, children: React.ReactNode, onClick?: () => void, disabled?: boolean, isActive?: boolean }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
    disabled={disabled}
  >
    {icon}
    <span className="ml-2">{children}</span>
  </button>
);

interface TopBarProps {
  onAddGame: () => void;
}

export const TopBar = ({ onAddGame }: TopBarProps) => {
  const { user, loginWithSteam, logout, loading: authLoading } = useAuth();
  const { clearGames } = useGames();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-white">GameBacklog</h1>
        <nav className="flex items-center space-x-2">
          <NavItem icon={<LayoutDashboard size={18} />} onClick={() => navigate('/')} isActive={location.pathname === '/'}>Dashboard</NavItem>
          <NavItem icon={<Trophy size={18} />} onClick={() => navigate('/achievements')} isActive={location.pathname === '/achievements'}>Achievements</NavItem>
          <NavItem icon={<Heart size={18} />} onClick={() => navigate('/wishlist')} isActive={location.pathname === '/wishlist'}>Wishlist</NavItem>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onAddGame}
          disabled={!user}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle size={18} />
          <span>Add Game</span>
        </button>
        <div className="relative group w-10 h-10">
           {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full cursor-pointer" />
          ) : (
            <UserCircle size={40} className="text-white cursor-pointer" />
          )}
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none group-hover:pointer-events-auto">
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-sm font-semibold text-white">{user?.displayName || 'Guest'}</p>
              {!user && (
                <button
                  onClick={loginWithSteam}
                  disabled={authLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <LogIn size={14} />
                  <span>Login with Steam</span>
                </button>
              )}
            </div>
            {user && (
              <>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"><Settings size={16} /> Settings</button>
                <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2" disabled={authLoading}><LogOut size={16}/> Logout</button>
                <div className="border-t border-gray-700 my-1"></div>
                <button onClick={clearGames} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2" disabled={!user}><Trash2 size={16} /> Clear All Data</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}; 