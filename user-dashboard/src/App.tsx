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
import KanBanBoard from './components/KanBanBoard';
import DashboardOverview from './components/DashboardOverview';
import GameLibrary from './components/GameLibrary';
import AddGamePage from './components/AddGamePage';

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
    <ConfigProvider>
      <Router>
        {user ? (
          <AppLayout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path='/dashboard' element={<DashboardOverview />} />
              <Route path='/board' element={<KanBanBoard />} />
              <Route path='/games' element={<GameLibrary />} />
              <Route path='/add-game' element={<AddGamePage />} />
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
  <div style={{ textAlign: 'center', paddingTop: '100px', height: '100vh' }}>
    <h2>Welcome to GameBacklog</h2>
    <p>Please log in with your Steam account to continue.</p>
    <Button type='primary' size='large' onClick={onLogin}>
      Login with Steam
    </Button>
  </div>
);

export default App;
