import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Typography, Progress } from 'antd';
import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import StatusBadge from './StatusBadge';
import type { UserGame } from '../../services/api';

const { Text } = Typography;

interface GameCardProps {
    game: UserGame;
    onClick?: () => void;
    onEdit?: (e: React.MouseEvent) => void;
    className?: string;
    showProgress?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
    game,
    onClick,
    onEdit,
    className,
    showProgress = false,
}) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state when game changes
    useEffect(() => {
        setImgError(false);
    }, [game.game?.header_image]);

    // Format playtime
    const formatPlaytime = (hours: number) => {
        if (!hours) return '0h';
        return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
    };

    return (
        <motion.div
            layoutId={game.$id}
            className={`glass-card game-card ${className || ''}`}
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            style={{
                background: 'rgba(30, 30, 50, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Cover Image */}
            <div
                className="game-card-cover"
                style={{
                    position: 'relative',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    width: '100%',
                    overflow: 'hidden',
                    backgroundColor: '#0f0f18',
                }}
            >
                {!imgError && game.game?.header_image ? (
                    <img
                        src={game.game.header_image}
                        alt={game.game?.name}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                        }}
                        className="game-cover-img"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #2a2a35 0%, #151520 100%)',
                            padding: 16,
                            textAlign: 'center',
                        }}
                    >
                        <Text strong style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {game.game?.name || 'Unknown Game'}
                        </Text>
                    </div>
                )}

                {/* Overlay on hover */}
                <div
                    className="game-card-overlay"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(15,15,25,0.9), transparent)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '12px',
                        justifyContent: 'flex-end'
                    }}
                >
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(e);
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <EditOutlined />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '8px' }}>
                    <Text
                        strong
                        style={{
                            color: 'rgba(255,255,255,0.95)',
                            fontSize: '14px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            marginBottom: 4
                        }}
                        title={game.game?.name}
                    >
                        {game.game?.name || 'Unknown Game'}
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {game.game?.genres?.slice(0, 2).map((genre, i) => (
                            <span key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                {genre}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusBadge status={game.status} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                        <ClockCircleOutlined />
                        <span>{formatPlaytime(game.hours_played)}</span>
                    </div>
                </div>

                {/* Optional Progress Bar for currently playing/completed */}
                {showProgress &&
                    (game.status === 'currently_playing' || game.status === 'completed' || game.status === 'completed_100') && (
                        <div style={{ marginTop: 8 }}>
                            <Progress
                                percent={
                                    game.status === 'completed' || game.status === 'completed_100'
                                        ? 100
                                        : Math.min(100, Math.round(((game.hours_played || 0) / 20) * 100)) // Arbitrary 20h target for demo
                                }
                                size="small"
                                showInfo={false}
                                strokeColor={
                                    game.status === 'currently_playing' ? '#7B61FF' : '#4ECB71'
                                }
                                trailColor="rgba(255,255,255,0.1)"
                            />
                        </div>
                    )}
            </div>

            <style>{`
        .game-card:hover .game-card-overlay {
          opacity: 1;
        }
        .game-card:hover .game-cover-img {
          transform: scale(1.05);
        }
      `}</style>
        </motion.div>
    );
};

export default GameCard;
