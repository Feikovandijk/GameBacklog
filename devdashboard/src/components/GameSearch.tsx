import React, { useState, useCallback, useMemo, useEffect } from 'react';
import debounce from 'lodash.debounce';

interface SearchResultGame {
  $id: string;
  name: string;
  header_image: string | null;
  total_reviews: number | null;
  steam_appid: number;
}

const GameSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/games/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SearchResultGame[] = await response.json();
      setResults(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred");
      }
      console.error("Error searching games:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 500),
    [performSearch]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

  return (
    <div className="game-search">
      <h2>Search for a Game in DB</h2>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="E.g., Cyberpunk 2077..."
        className="search-input"
      />
      {isLoading && <p>Searching...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      <div className="search-results">
        {results.length > 0 ? (
          results.map(game => (
            <div key={game.$id} className="search-result-item">
               <a href={`https://store.steampowered.com/app/${game.steam_appid}`} target="_blank" rel="noopener noreferrer">
                  <img src={game.header_image || ''} alt={game.name} className="result-game-image" />
               </a>
               <div className="result-game-info">
                    <h4>{game.name}</h4>
                    <p>Reviews: {game.total_reviews?.toLocaleString() || 'N/A'}</p>
               </div>
            </div>
          ))
        ) : (
          query.length >= 3 && !isLoading && !error && <p className="no-results-message">No results found.</p>
        )}
      </div>
    </div>
  );
};

export default GameSearch; 