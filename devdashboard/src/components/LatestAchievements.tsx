import React, { useState, useEffect } from 'react';

interface Achievement {
  $id: string;
  api_name: string;
  display_name: string;
  description: string | null;
  global_percentage: number | null;
  hidden: boolean;
  icon: string | null;
}

interface GameWithAchievements {
  $id: string;
  name: string;
  steam_appid: number;
  last_updated: string;
  achievements: Achievement[];
}

const LatestAchievements: React.FC = () => {
  const [data, setData] = useState<GameWithAchievements[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestAchievements = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/latest-games-with-achievements`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: GameWithAchievements[] = await response.json();
        setData(result);
      } catch (e) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError("An unknown error occurred");
        }
        console.error("Error fetching latest achievements:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestAchievements();
  }, []);

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  if (loading) return <div className="latest-achievements-container"><h2>Latest Game Achievements</h2><p>Loading...</p></div>;
  if (error) return <div className="latest-achievements-container"><h2>Latest Game Achievements</h2><p className="error-message">Error: {error}</p></div>;
  if (!data || data.length === 0) return <div className="latest-achievements-container"><h2>Latest Game Achievements</h2><p>No recent games with achievements found.</p></div>;

  return (
    <div className="latest-achievements-container">
      <h2>Latest Game Achievements</h2>
      <p className="subtitle">Showing achievements for the 5 most recently updated games.</p>
      <div className="game-list">
        {data.map((game) => (
          <div key={game.$id} className="game-item">
            <div className="game-header" onClick={() => toggleGame(game.$id)}>
              <span className="game-name">{game.name}</span>
              <span className="game-info">(AppID: {game.steam_appid}) - {game.achievements.length} achievements</span>
            </div>
            {expandedGame === game.$id && (
              <div className="achievements-table-container">
                <table className="achievements-table">
                  <thead>
                    <tr>
                      <th>Icon</th>
                      <th>Display Name</th>
                      <th>API Name</th>
                      <th>Description</th>
                      <th>Global %</th>
                      <th>Hidden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.achievements.sort((a,b) => (b.global_percentage ?? 0) - (a.global_percentage ?? 0)).map((ach) => (
                      <tr key={ach.$id}>
                        <td>{ach.icon && <img src={ach.icon} alt={ach.display_name} className="achievement-icon" />}</td>
                        <td>{ach.display_name}</td>
                        <td><code>{ach.api_name}</code></td>
                        <td className="achievement-description">{ach.description}</td>
                        <td>{ach.global_percentage?.toFixed(2) ?? 'N/A'}</td>
                        <td>{ach.hidden ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestAchievements; 