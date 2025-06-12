import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

interface PlayerGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  achievements: {
    unlocked: number;
    total: number;
  };
}

const API_BASE_URL = 'http://localhost:3001';

export default function Achievements() {
  const { user } = useAuth();
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{ lastUpdated: number | null, isRefreshAllowed: boolean }>({ lastUpdated: null, isRefreshAllowed: false });

  const totalAchievements = useMemo(() => games.reduce((acc, g) => acc + g.achievements.unlocked, 0), [games]);
  const totalPlaytimeHours = useMemo(() => Math.round(games.reduce((acc, g) => acc + g.playtime_forever, 0) / 60), [games]);

  const fetchAchievements = async (forceRefresh = false) => {
    if (!user?.steamId) return;
    const endpoint = `${API_BASE_URL}/api/achievements/${user.steamId}${forceRefresh ? '?force=true' : ''}`;
    
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch achievements: ${response.statusText}`);
      const data: PlayerGame[] = await response.json();
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      if (forceRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  };
  
  const fetchCacheStatus = async () => {
    if (!user?.steamId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/achievements/${user.steamId}/status`);
      const data = await response.json();
      setCacheStatus(data);
    } catch (err) {
      console.error("Failed to fetch cache status", err);
    }
  };

  useEffect(() => {
    if (!user?.steamId) {
      setError('Please log in with Steam to see your achievements.');
      setLoading(false);
      return;
    }
    fetchAchievements();
    fetchCacheStatus();
  }, [user]);

  const handleRefresh = async () => {
    await fetchAchievements(true);
    await fetchCacheStatus(); // Update status after refresh
  };

  if (loading) return <div className="text-center p-8">Loading achievements...</div>;
  if (error) return <div className="text-center p-8 text-red-400">{error}</div>;

  const lastUpdatedDate = cacheStatus.lastUpdated ? new Date(cacheStatus.lastUpdated).toLocaleString() : 'Never';

  return (
    <div className="bg-[#1b232a] min-h-screen text-gray-200 font-sans">
      <div className="flex items-center justify-between p-8 border-b border-gray-700 bg-[#232b32]">
        <div className="flex items-center gap-6">
          <img src={user?.avatarUrl} alt="avatar" className="w-24 h-24 rounded shadow-lg border-4 border-gray-800" />
          <div>
            <h1 className="text-3xl font-bold text-white">{user?.displayName}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
              <span>Games <span className="text-white font-semibold">{games.length}</span></span>
              <span>Achievements <span className="text-white font-semibold">{totalAchievements.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <button 
            onClick={handleRefresh} 
            disabled={!cacheStatus.isRefreshAllowed || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <p className="text-xs text-gray-500 mt-2">Last updated: {lastUpdatedDate}</p>
        </div>
      </div>
      <div className="p-8">
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full bg-[#232b32] text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2">Unlocked</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">%</th>
                <th className="px-4 py-2">Playtime</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.appid} className="border-b border-gray-800 hover:bg-[#28313a] transition">
                  <td className="flex items-center gap-3 px-4 py-2">
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`}
                      alt="icon"
                      className="w-24 h-9 object-cover rounded"
                    />
                    <span className="text-white font-semibold">{g.name}</span>
                  </td>
                  <td className="text-center font-semibold text-white">{g.achievements.unlocked}</td>
                  <td className="text-center">{g.achievements.total}</td>
                  <td className="text-center font-semibold text-green-400">
                    {g.achievements.total > 0 ? Math.round((g.achievements.unlocked / g.achievements.total) * 100) : 0}%
                  </td>
                  <td className="text-center whitespace-nowrap">{Math.round(g.playtime_forever / 60)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 