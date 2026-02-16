import React, { useState, useEffect } from 'react';
import { authAPI, userProfileAPI, userGamesAPI } from '../services/api';
import type { User } from '../services/api';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form state for editable fields
  const [autoImport, setAutoImport] = useState(true);
  const [syncPlaytime, setSyncPlaytime] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState('want_to_play');
  const [defaultView, setDefaultView] = useState('grid');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        const u = response.data;
        setUser(u);
        setAutoImport(u.auto_import_steam_games);
        setSyncPlaytime(u.sync_steam_playtime);
        setDefaultStatus(u.default_game_status);
        setDefaultView(u.default_view);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const hasChanges =
    user !== null &&
    (autoImport !== user.auto_import_steam_games ||
      syncPlaytime !== user.sync_steam_playtime ||
      defaultStatus !== user.default_game_status ||
      defaultView !== user.default_view);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await userProfileAPI.updateProfile({
        auto_import_steam_games: autoImport,
        sync_steam_playtime: syncPlaytime,
        default_game_status: defaultStatus,
        default_view: defaultView,
      });
      setUser(response.data);
      setSaveMessage({ type: 'success', text: 'Settings saved' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await userGamesAPI.syncSteamLibrary();
      // Refresh user to get updated last_steam_sync
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Error syncing library:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (!user) return null;

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lastSync = user.last_steam_sync
    ? new Date(user.last_steam_sync).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const lastActive = user.last_active
    ? new Date(user.last_active).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div className='flex flex-col'>
      {/* Page Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4'>
        <div className='flex flex-col max-w-[700px]'>
          <h1 className='text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight mb-2'>
            Profile Settings
          </h1>
          <p className='text-text-secondary text-base font-normal leading-normal'>
            Manage your account preferences and Steam integration settings.
          </p>
        </div>
      </div>

      {/* User Info Header Card */}
      <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark mb-6 shadow-sm'>
        <div className='flex flex-col md:flex-row md:items-center gap-6'>
          <div
            className='bg-center bg-no-repeat bg-cover rounded-full size-20 border-2 border-primary shadow-lg shadow-primary/20 shrink-0'
            style={{ backgroundImage: `url("${user.avatar_url}")` }}
          />
          <div className='flex-1 min-w-0'>
            <div className='flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1'>
              <h2 className='text-white text-2xl font-bold truncate'>
                {user.display_name}
              </h2>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium w-fit ${
                  user.is_public_profile
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-surface-hover text-text-secondary border border-border-dark'
                }`}
              >
                {user.is_public_profile ? 'Public Profile' : 'Private Profile'}
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary text-sm mt-1'>
              <div className='flex items-center gap-1'>
                <span className='material-symbols-outlined text-[16px]'>
                  fingerprint
                </span>
                <span>{user.steam_id}</span>
              </div>
              {user.country_code && (
                <div className='flex items-center gap-1'>
                  <span className='material-symbols-outlined text-[16px]'>
                    flag
                  </span>
                  <span>{user.country_code}</span>
                </div>
              )}
              <div className='flex items-center gap-1'>
                <span className='material-symbols-outlined text-[16px]'>
                  calendar_today
                </span>
                <span>Member since {memberSince}</span>
              </div>
            </div>
            {user.profile_url && (
              <a
                href={user.profile_url}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 mt-2 text-primary text-sm font-medium hover:underline'
              >
                <span className='material-symbols-outlined text-[16px]'>
                  open_in_new
                </span>
                View Steam Profile
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
        {/* Steam Integration Card */}
        <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark hover:border-primary/30 transition-colors shadow-sm'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
              <span className='material-symbols-outlined text-[24px]'>
                sync
              </span>
            </div>
            <div>
              <h3 className='text-white text-lg font-bold'>
                Steam Integration
              </h3>
              <p className='text-text-secondary text-xs'>
                Control how your Steam library syncs
              </p>
            </div>
          </div>

          <div className='flex flex-col gap-4'>
            {/* Auto Import Toggle */}
            <div className='flex items-center justify-between p-3 bg-background-dark/50 rounded-lg border border-border-dark'>
              <div className='flex-1 mr-4'>
                <p className='text-white text-sm font-medium'>
                  Auto-import Steam games
                </p>
                <p className='text-text-secondary text-xs mt-1'>
                  Automatically add new games from your Steam library
                </p>
              </div>
              <button
                onClick={() => setAutoImport(!autoImport)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  autoImport ? 'bg-primary' : 'bg-surface-hover'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoImport ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sync Playtime Toggle */}
            <div className='flex items-center justify-between p-3 bg-background-dark/50 rounded-lg border border-border-dark'>
              <div className='flex-1 mr-4'>
                <p className='text-white text-sm font-medium'>Sync playtime</p>
                <p className='text-text-secondary text-xs mt-1'>
                  Keep playtime hours updated from Steam
                </p>
              </div>
              <button
                onClick={() => setSyncPlaytime(!syncPlaytime)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  syncPlaytime ? 'bg-primary' : 'bg-surface-hover'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    syncPlaytime ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Last Sync Info */}
            <div className='p-3 bg-background-dark/30 rounded-lg border border-border-dark/50'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-text-secondary text-xs'>
                  <span className='material-symbols-outlined text-[16px]'>
                    schedule
                  </span>
                  <span>Last synced: {lastSync}</span>
                </div>
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className='flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-dark bg-surface-dark hover:bg-surface-hover text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}
                  >
                    {syncing ? 'progress_activity' : 'sync'}
                  </span>
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Library Defaults Card */}
        <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark hover:border-primary/30 transition-colors shadow-sm'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='size-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue'>
              <span className='material-symbols-outlined text-[24px]'>
                settings
              </span>
            </div>
            <div>
              <h3 className='text-white text-lg font-bold'>Library Defaults</h3>
              <p className='text-text-secondary text-xs'>
                Set defaults for new games
              </p>
            </div>
          </div>

          <div className='flex flex-col gap-4'>
            {/* Default Status */}
            <div className='flex flex-col gap-2'>
              <label className='text-white text-sm font-medium'>
                Default game status
              </label>
              <select
                value={defaultStatus}
                onChange={e => setDefaultStatus(e.target.value)}
                className='px-3 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer'
              >
                <option value='want_to_play'>Want to Play</option>
                <option value='currently_playing'>Currently Playing</option>
                <option value='completed'>Completed</option>
                <option value='completed_100'>Completed 100%</option>
                <option value='on_hold'>On Hold</option>
                <option value='dropped'>Dropped</option>
              </select>
              <p className='text-text-secondary text-xs'>
                Status applied when adding games to your library
              </p>
            </div>

            {/* Default View */}
            <div className='flex flex-col gap-2'>
              <label className='text-white text-sm font-medium'>
                Default library view
              </label>
              <select
                value={defaultView}
                onChange={e => setDefaultView(e.target.value)}
                className='px-3 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer'
              >
                <option value='grid'>Grid View</option>
                <option value='list'>List View</option>
              </select>
              <p className='text-text-secondary text-xs'>
                How your library displays by default
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className='bg-surface-dark rounded-2xl p-6 border border-border-dark shadow-sm mb-6'>
        <div className='flex items-center gap-3 mb-5'>
          <div className='size-10 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple'>
            <span className='material-symbols-outlined text-[24px]'>
              account_circle
            </span>
          </div>
          <div>
            <h3 className='text-white text-lg font-bold'>
              Account Information
            </h3>
            <p className='text-text-secondary text-xs'>
              Your account details and activity
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='p-4 bg-background-dark/50 rounded-lg border border-border-dark'>
            <p className='text-text-secondary text-xs mb-1'>Steam ID</p>
            <p className='text-white text-sm font-mono'>{user.steam_id}</p>
          </div>
          <div className='p-4 bg-background-dark/50 rounded-lg border border-border-dark'>
            <p className='text-text-secondary text-xs mb-1'>Member Since</p>
            <p className='text-white text-sm'>{memberSince}</p>
          </div>
          <div className='p-4 bg-background-dark/50 rounded-lg border border-border-dark'>
            <p className='text-text-secondary text-xs mb-1'>Last Active</p>
            <p className='text-white text-sm'>{lastActive}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className='flex items-center justify-end gap-3'>
        {saveMessage && (
          <span
            className={`text-sm font-medium ${
              saveMessage.type === 'success'
                ? 'text-primary'
                : 'text-status-error'
            }`}
          >
            {saveMessage.text}
          </span>
        )}
        <button
          onClick={handleSaveSettings}
          disabled={saving || !hasChanges}
          className='flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <span className='material-symbols-outlined text-[18px]'>save</span>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
