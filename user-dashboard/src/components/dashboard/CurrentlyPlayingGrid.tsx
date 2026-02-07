import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { userGamesAPI } from '../../services/api';
import type { UserGame } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const CurrentlyPlayingGrid: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState<UserGame[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const response = await userGamesAPI.get({
                    status: 'currently_playing',
                    limit: 4,
                });
                setGames(response.data.documents);
            } catch (error) {
                console.error('Error fetching games:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    const formatPlaytime = (hours: number) => {
        if (!hours || hours === 0) return 'No playtime';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

    if (loading) {
        return (
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <PlayCircleOutlined style={{ color: '#52c41a' }} />
                        Currently Playing
                    </h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            </motion.div>
        );
    }

    if (games.length === 0) {
        return (
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <PlayCircleOutlined style={{ color: '#52c41a' }} />
                        Currently Playing
                    </h3>
                </div>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-muted)',
                    }}
                >
                    <PlayCircleOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                    No games in progress
                    <br />
                    <span style={{ fontSize: 13 }}>Start a game from your library!</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="dashboard-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
        >
            <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                    <PlayCircleOutlined style={{ color: '#52c41a' }} />
                    Currently Playing ({games.length})
                </h3>
                <button
                    onClick={() => navigate('/games?status=currently_playing')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-purple)',
                        cursor: 'pointer',
                        fontSize: 14,
                    }}
                >
                    View All →
                </button>
            </div>
            <div className="playing-games-grid">
                {games.map((game, index) => (
                    <motion.div
                        key={game.id}
                        className="playing-game-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index, duration: 0.3 }}
                        onClick={() => navigate('/games')}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={game.game?.header_image || 'https://via.placeholder.com/460x215'}
                            alt={game.game?.name || 'Game'}
                            className="playing-game-card-image"
                        />
                        <div className="playing-game-card-content">
                            <h4 className="playing-game-card-title">
                                {game.game?.name || 'Unknown Game'}
                            </h4>
                            <div className="playing-game-card-meta">
                                <span className="playing-game-card-playtime">
                                    <ClockCircleOutlined />
                                    {formatPlaytime(game.hours_played)}
                                </span>
                                {game.game?.genres && game.game.genres.length > 0 && (
                                    <span>• {game.game.genres[0]}</span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default CurrentlyPlayingGrid;
