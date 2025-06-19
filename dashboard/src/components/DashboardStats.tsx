import React, { useState, useEffect } from 'react';

interface GameStats {
  totalGames: number;
  updatedGames: number;
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/stats`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: GameStats = await response.json();
        setStats(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError("An unknown error occurred");
        }
        console.error("Error fetching stats:", e);
      }
    };

    fetchStats();
    // Set up a poller to refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <div className="stat-card">
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">{value}</p>
    </div>
  );

  return (
    <div className="dashboard-stats">
      <h2>Database Statistics</h2>
      {error && <p className="error-message">Error loading stats: {error}</p>}
      {stats ? (
        <div className="stats-container">
          <StatCard title="Total Games in Database" value={stats.totalGames.toLocaleString()} />
          <StatCard title="Games Fully Updated" value={stats.updatedGames.toLocaleString()} />
        </div>
      ) : (
        <p>Loading stats...</p>
      )}
    </div>
  );
};

export default DashboardStats; 