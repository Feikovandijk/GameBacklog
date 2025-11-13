import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { authAPI } from './services/api';
import type { User } from './services/api';
import { Button, Spin, ConfigProvider } from 'antd';
import AppLayout from './components/AppLayout';
import BoardView from './components/BoardView';
import DashboardOverview from './components/DashboardOverview';
import GameListPage from './components/GameListPage';
import AddGamePage from './components/AddGamePage';
import WishlistPage from './components/WishlistPage';
import NotesPage from './components/NotesPage';
import WorkspacePage from './components/WorkspacePage';
import BacklogPage from './components/BacklogPage';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser.data);
      } catch {
        console.log('No user logged in');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogin = () => {
    authAPI.login();
  };

  const handleLogout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: undefined, // We'll use custom CSS
        token: {
          colorPrimary: '#60a5fa',
          colorBgContainer: '#1f2937',
          colorBgElevated: '#374151',
          colorText: '#ffffff',
          colorTextSecondary: '#9ca3af',
          colorBorder: '#374151',
          borderRadius: 8,
        },
        components: {
          Layout: {
            siderBg: '#252b4a',
            headerBg: '#1a1f3a',
            bodyBg: '#1a1f3a',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: '#60a5fa',
            darkItemHoverBg: '#2d3454',
            darkItemColor: '#9ca3af',
            darkItemSelectedColor: '#ffffff',
            darkItemHoverColor: '#ffffff',
          },
        },
      }}
    >
      <Router>
        {user ? (
          <AppLayout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path='/dashboard' element={<DashboardOverview />} />
              <Route path='/dashboard/notes' element={<NotesPage />} />
              <Route path='/dashboard/tags' element={<div>Tags Page</div>} />
              <Route path='/board' element={<BoardView />} />
              <Route path='/workspace' element={<WorkspacePage />} />
              <Route path='/backlog' element={<BacklogPage />} />
              <Route path='/games' element={<GameListPage />} />
              <Route path='/add-game' element={<AddGamePage />} />
              <Route path='/steam-wishlist' element={<WishlistPage />} />
              <Route path='/analytics' element={<div>Analytics Page</div>} />
              <Route path='/achievements' element={<div>Achievements Page</div>} />
              <Route path='/settings' element={<div>Settings Page</div>} />
              <Route path='/profile' element={<div>Profile Page</div>} />
              <Route path='*' element={<Navigate to='/dashboard' />} />
            </Routes>
          </AppLayout>
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </Router>
    </ConfigProvider>
  );
};

const LoginPage = ({ onLogin }: { onLogin: () => void }) => (
  <div 
    style={{ 
      textAlign: 'center', 
      paddingTop: '100px', 
      height: '100vh',
      background: 'var(--primary-bg)',
      color: 'var(--text-primary)',
    }}
  >
    <h2 style={{ color: 'var(--text-primary)', fontSize: '2rem', marginBottom: '1rem' }}>
      Welcome to GameBacklog
    </h2>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
      Please log in with your Steam account to continue.
    </p>
    <Button 
      type='primary' 
      size='large' 
      onClick={onLogin}
      style={{
        background: 'var(--accent-gradient)',
        border: 'none',
        height: '48px',
        padding: '0 32px',
        fontSize: '16px',
        fontWeight: '600',
      }}
    >
      Login with Steam
    </Button>
  </div>
);

export default App;
