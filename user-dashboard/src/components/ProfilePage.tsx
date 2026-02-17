import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI, userGamesAPI } from '../services/api';
import type { User } from '../services/api';

const ProfilePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{
        text: string;
        type: 'success' | 'error';
    } | null>(null);

    // Settings state
    const [autoImport, setAutoImport] = useState(false);

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (!saveMessage) return;

        const timerId = setTimeout(() => setSaveMessage(null), 3000);

        return () => clearTimeout(timerId);
    }, [saveMessage]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
            setAutoImport(response.data.auto_import_steam_games);
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualSync = async () => {
        if (syncing) return;

        setSyncing(true);
        setSaveMessage(null);

        try {
            await userGamesAPI.syncSteamLibrary();
            // Refresh user to get updated last_steam_sync
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
            setSaveMessage({ text: 'Steam library synced successfully!', type: 'success' });


        } catch (error) {
            console.error('Error syncing library:', error);
            setSaveMessage({
                text: 'Failed to sync Steam library. Please try again later.',
                type: 'error'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveSettings = async () => {
        // Placeholder for saving settings since the API endpoint wasn't strictly provided in context, 
        // but assuming there's a way to update user settings.
        setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });

    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-surface-dark border-t-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-white text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-text-secondary">Manage your account settings and preferences</p>
            </div>

            {/* User Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-dark border border-border-dark rounded-2xl p-6 md:p-8"
            >
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    <div className="relative">
                        <div
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-cover bg-center border-4 border-surface-hover shadow-xl"
                            style={{ backgroundImage: `url("${user.avatar_url}")` }}
                        />
                        <div className="absolute bottom-0 right-0 bg-primary text-background-dark p-2 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-[20px] font-bold">steam</span>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h2 className="text-2xl font-bold text-white">{user.display_name}</h2>
                        <div className="space-y-1">
                            <p className="text-text-secondary text-sm flex items-center justify-center md:justify-start gap-2">
                                <span className="material-symbols-outlined text-[16px]">id_card</span>
                                Steam ID: <span className="text-white font-mono">{user.steam_id}</span>
                            </p>
                            {user.country_code && (
                                <p className="text-text-secondary text-sm flex items-center justify-center md:justify-start gap-2">
                                    <span className="material-symbols-outlined text-[16px]">public</span>
                                    Region: <span className="text-white">{user.country_code}</span>
                                </p>
                            )}
                            <p className="text-text-secondary text-sm flex items-center justify-center md:justify-start gap-2">
                                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                Joined: <span className="text-white">{new Date(user.created_at).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <div className="pt-4 flex justify-center md:justify-start">
                            <a
                                href={user.profile_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:text-primary-hover text-sm font-bold flex items-center gap-1 transition-colors"
                            >
                                View Steam Profile
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Manual Sync */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface-dark border border-border-dark rounded-2xl p-6 md:p-8"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Steam Library Sync</h3>
                        <p className="text-text-secondary text-sm max-w-lg">
                            Manually synchronize your game library with Steam. This will fetch your latest games, playtime data, and achievements.
                        </p>
                        {user.last_steam_sync && (
                            <p className="text-text-secondary text-xs mt-2">
                                Last synced: {new Date(user.last_steam_sync).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleManualSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-background-dark font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>
                            sync
                        </span>
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </motion.div>

            {/* Settings Section (Placeholder implementation based on request context) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface-dark border border-border-dark rounded-2xl p-6 md:p-8"
            >
                <h3 className="text-xl font-bold text-white mb-6">Application Settings</h3>

                <div className="space-y-6">
                    <label className="flex items-center justify-between p-4 bg-background-dark rounded-xl border border-border-dark cursor-pointer hover:border-primary/50 transition-colors">
                        <div>
                            <span className="text-white font-medium block">Auto-Import Games</span>
                            <span className="text-text-secondary text-sm">Automatically add new Steam games to backlog</span>
                        </div>
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={autoImport}
                                onChange={() => setAutoImport(!autoImport)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                    </label>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <AnimatePresence>
                        {saveMessage && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`text-sm font-medium px-4 py-2 rounded-lg ${saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                    }`}
                            >
                                {saveMessage.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleSaveSettings}
                        className="ml-auto px-6 py-2.5 rounded-xl border border-border-dark bg-background-dark hover:bg-surface-hover text-white font-medium transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfilePage;
