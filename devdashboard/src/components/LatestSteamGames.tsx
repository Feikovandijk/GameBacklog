import React, { useState, useEffect } from 'react';

interface SteamGame {
    name: string;
    steam_appid: number;
    header_image: string;
    total_reviews: number | null;
    release_date: string | null;
}

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
    } catch (e) {
        return 'Invalid Date';
    }
}

const LatestSteamGames: React.FC = () => {
  const [games, setGames] = useState<SteamGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestSteamGames = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/latest-steam-games`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: SteamGame[] = await response.json();
        setGames(data);
      } catch (e: any) {
        setError(e.message);
        console.error("Error fetching latest Steam games:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestSteamGames();
  }, []);

  return (
    <div className="info-card latest-steam-additions">
      <h3>Latest Steam Additions</h3>
      {loading && <p>Loading...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && (
        <div className="latest-games-grid">
          {games.map(game => (
            <div key={game.steam_appid} className="game-card">
              <a href={`https://store.steampowered.com/app/${game.steam_appid}`} target="_blank" rel="noopener noreferrer">
                {game.header_image ? (
                    <img src={game.header_image} alt={game.name} className="game-image" />
                ) : (
                    <div className="game-image-placeholder">
                        <span>No Image</span>
                    </div>
                )}
                <div className="game-info-overlay">
                    <div className="game-title">{game.name}</div>
                    <div className="game-stats">
                        <span>{formatDate(game.release_date)}</span>
                        <span>{game.total_reviews?.toLocaleString() ?? 'No'} reviews</span>
                    </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LatestSteamGames; 