import React, { useState, useEffect } from 'react';

interface Game {
  $id: string;
  name: string;
  header_image: string;
  total_reviews: number;
  steam_appid: number;
}

const MostReviewedGames: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMostReviewedGames = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/games/most-reviewed`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Game[] = await response.json();
        setGames(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError("An unknown error occurred");
        }
        console.error("Error fetching most reviewed games:", e);
      }
    };

    fetchMostReviewedGames();
    const interval = setInterval(fetchMostReviewedGames, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="most-reviewed-games">
      <h2>Top 10 Most Reviewed Games</h2>
      {error && <p className="error-message">Error loading games: {error}</p>}
      {games.length > 0 ? (
        <div className="games-list">
          {games.map((game, index) => (
            <div key={game.$id} className="game-card">
              <span className="game-rank">{index + 1}.</span>
              <img src={game.header_image} alt={game.name} className="game-image" />
              <div className="game-info">
                <a
                  href={`https://store.steampowered.com/app/${game.steam_appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="game-name-link"
                >
                  {game.name}
                </a>
                <p className="game-reviews">{(game.total_reviews || 0).toLocaleString()} reviews</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !error && <p>Loading most reviewed games...</p>
      )}
    </div>
  );
};

export default MostReviewedGames; 