import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { authAPI } from './services/api';
import type { User } from './services/api';
// import { Button, Spin, ConfigProvider } from 'antd';
// import { Spin } from 'antd'; // Removed antd Spin
import AppLayout from './components/AppLayout';
import KanBanBoard from './components/KanBanBoard';
import DashboardOverview from './components/DashboardOverview';
import GameLibrary from './components/GameLibrary';
import AddGamePage from './components/AddGamePage';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import TrendsPage from './components/TrendsPage';
import AnalysisPage from './components/AnalysisPage';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser.data);
        // Fetch CSRF token after auth so it's generated with the authenticated
        // session identifier — otherwise it's generated as 'anon' and all
        // state-changing requests will fail with 403 invalid csrf token.
        await authAPI.fetchCsrfToken();
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
      <div className='flex h-screen w-full items-center justify-center bg-background-dark'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-surface-dark border-t-primary' />
      </div>
    );
  }

  return (
    <Router>
      {user ? (
        <AppLayout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path='/dashboard' element={<DashboardOverview />} />
            <Route path='/board' element={<KanBanBoard />} />
            <Route path='/games' element={<GameLibrary />} />
            <Route path='/add-game' element={<AddGamePage />} />
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/trends' element={<TrendsPage />} />
            <Route path='/analysis' element={<AnalysisPage />} />
            <Route path='*' element={<Navigate to='/dashboard' />} />
          </Routes>
        </AppLayout>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </Router>
  );
};

export default App;
