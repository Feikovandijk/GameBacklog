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
  Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGames } from '../contexts/GamesContext';
import { useLocation, useNavigate } from 'react-router-dom';

const NavItem = ({ icon, children, onClick, disabled, isActive }: { icon: React.ReactNode, children: React.ReactNode, onClick?: () => void, disabled?: boolean, isActive?: boolean }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center px-4 py-2 text-gray-300 rounded-md transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
    disabled={disabled}
  >
    {icon}
    <span className="ml-3">{children}</span>
  </button>
);

interface SidebarProps {
  onAddGame: () => void;
}

export const Sidebar = ({ onAddGame }: SidebarProps) => {
  const { user, loginWithSteam, logout, loading: authLoading } = useAuth();
  const { clearGames } = useGames();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-4 mb-10">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full" />
          ) : (
            <UserCircle size={40} className="text-white" />
          )}
          <div>
            <h2 className="font-semibold text-white">{user?.displayName || 'Guest'}</h2>
            {user ? (
              <p className="text-sm text-gray-400">Logged in</p>
            ) : (
              <button
                onClick={loginWithSteam}
                disabled={authLoading}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
              >
                <LogIn size={16} />
                <span>Login with Steam</span>
              </button>
            )}
          </div>
        </div>

        <nav className="space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} onClick={() => navigate('/')} isActive={location.pathname === '/'}>Dashboard</NavItem>
          <NavItem icon={<List size={20} />} onClick={() => navigate('/kanban')} isActive={location.pathname === '/kanban'}>Kanban Board</NavItem>
          <NavItem icon={<Trophy size={20} />} onClick={() => navigate('/achievements')} isActive={location.pathname === '/achievements'}>Achievements</NavItem>
          <NavItem icon={<PlusCircle size={20} />} onClick={onAddGame} disabled={!user}>Add Game</NavItem>
        </nav>
      </div>

      <div>
        <div className="space-y-2 border-t border-gray-700 pt-4 mt-4">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</h3>
          {user ? (
            <>
              <NavItem icon={<LogOut size={20} />} onClick={logout} disabled={authLoading}>
                Logout
              </NavItem>
            </>
          ) : (
            <p className="px-4 text-xs text-gray-500">Log in to manage your account.</p>
          )}
          <NavItem icon={<Settings size={20} />}>Settings</NavItem>
          <NavItem icon={<Trash2 size={20} />} onClick={clearGames} disabled={!user}>Clear All Data</NavItem>
        </div>
      </div>
    </aside>
  );
}; 