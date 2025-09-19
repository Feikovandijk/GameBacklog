import React, { useState, useEffect } from 'react';

// Define specific types for game and achievement data
interface AchievementDocument {
  $id: string;
  api_name: string;
  display_name: string;
  description?: string | null;
  icon?: string | null;
  global_percentage?: number | null;
  hidden?: boolean;
}

interface GameDocument {
  $id: string;
  name: string;
  steam_appid: number;
  last_updated: string;
  // Allow for other dynamic properties from Appwrite
  [key: string]: unknown;
}

interface GameWithDetails extends GameDocument {
  achievements: AchievementDocument[];
}

const renderValue = (value: unknown) => {
  if (value === null || typeof value === 'undefined')
    return <span className='value-null'>null</span>;
  if (typeof value === 'boolean')
    return (
      <span className={value ? 'value-true' : 'value-false'}>
        {value.toString()}
      </span>
    );
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (
    typeof value === 'string' &&
    (value.startsWith('http') || value.startsWith('https://'))
  ) {
    return (
      <a href={value} target='_blank' rel='noopener noreferrer'>
        {value}
      </a>
    );
  }
  return String(value);
};

const LastSyncedGames: React.FC = () => {
  const [games, setGames] = useState<GameWithDetails[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestSynced = async () => {
      try {
        setLoading(true);
        const apiUrl =
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/latest-synced-games`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data: GameWithDetails[] = await response.json();
        setGames(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('An unknown error occurred while fetching data.');
        }
        console.error('Error fetching latest synced games:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestSynced();
  }, []);

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  if (loading)
    return (
      <div className='last-synced-container'>
        <h2>Last 10 Synced Games</h2>
        <p>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className='last-synced-container'>
        <h2>Last 10 Synced Games</h2>
        <p className='error-message'>Error: {error}</p>
      </div>
    );
  if (!games || games.length === 0)
    return (
      <div className='last-synced-container'>
        <h2>Last 10 Synced Games</h2>
        <p>No recently synced games found.</p>
      </div>
    );

  return (
    <div className='last-synced-container'>
      <h2>Last 10 Synced Games</h2>
      <div className='game-list'>
        {games.map(game => (
          <div key={game.$id} className='game-item'>
            <div className='game-header' onClick={() => toggleGame(game.$id)}>
              <span className='game-name'>
                {game.name} <small>(AppID: {game.steam_appid})</small>
              </span>
              <span className='game-info'>
                Synced: {new Date(game.last_updated).toLocaleString()}
              </span>
            </div>
            {expandedGame === game.$id && (
              <div className='game-details-container'>
                <h3>Game Data</h3>
                <div className='game-data-grid'>
                  {Object.entries(game).map(([key, value]) => {
                    if (key === 'achievements') return null; // Handled separately
                    return (
                      <React.Fragment key={key}>
                        <div className='data-key'>{key}</div>
                        <div className='data-value'>{renderValue(value)}</div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {game.achievements && game.achievements.length > 0 && (
                  <>
                    <h3 style={{ marginTop: '1.5rem' }}>
                      Achievements ({game.achievements.length})
                    </h3>
                    <div className='achievements-table-container'>
                      <table className='achievements-table'>
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
                          {game.achievements
                            .sort(
                              (a, b) =>
                                (b.global_percentage ?? 0) -
                                (a.global_percentage ?? 0)
                            )
                            .map(ach => (
                              <tr key={ach.$id}>
                                <td>
                                  {ach.icon && (
                                    <img
                                      src={ach.icon}
                                      alt={ach.display_name}
                                      className='achievement-icon'
                                    />
                                  )}
                                </td>
                                <td>{ach.display_name}</td>
                                <td>
                                  <code>{ach.api_name}</code>
                                </td>
                                <td className='achievement-description'>
                                  {ach.description}
                                </td>
                                <td>
                                  {ach.global_percentage?.toFixed(2) ?? 'N/A'}
                                </td>
                                <td>{ach.hidden ? 'Yes' : 'No'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LastSyncedGames;
