import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import type { UserGame } from '../../services/api';

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
    className = '',
    showProgress = false,
}) => {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [game.game?.header_image]);

    const formatPlaytime = (hours: number | undefined) => {
        if (!hours) return '0h';
        return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
    };

    const calculateProgress = () => {
        if (
            game.status === 'completed' ||
            game.status === 'completed_100'
        ) {
            return 100;
        }
        // Arbitrary target of 20h for demo purposes if not completed
        return Math.min(100, Math.round(((game.hours_played || 0) / 20) * 100));
    };

    return (
        <motion.div
            layoutId={game.$id}
            className={`group relative bg-surface-dark border border-border-dark rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${className}`}
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
        >
            {/* Cover Image */}
            <div className='relative aspect-video bg-background-dark overflow-hidden'>
                {!imgError && (game.game?.header_image || game.steam_appid) ? (
                    <img
                        src={game.game?.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                        alt={game.game?.name}
                        className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const fallbackUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`;
                            // If we weren't already trying the fallback logic or if the primary source failed
                            if (target.src !== fallbackUrl && game.steam_appid) {
                                target.src = fallbackUrl;
                            } else {
                                setImgError(true);
                            }
                        }}
                    />
                ) : (
                    <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background-dark to-surface-dark p-4 text-center'>
                        <span className='font-bold text-text-secondary text-sm'>
                            {game.game?.name || 'Unknown Game'}
                        </span>
                    </div>
                )}

                {/* Overlay with Edit Button */}
                {onEdit && (
                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3'>
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                onEdit(e);
                            }}
                            className='p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors'
                        >
                            <span className='material-symbols-outlined text-[20px]'>edit</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className='p-4 flex flex-col gap-3'>
                <div>
                    <h3
                        className='font-bold text-white text-base leading-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors'
                        title={game.game?.name}
                    >
                        {game.game?.name || 'Unknown Game'}
                    </h3>
                    <div className='flex flex-wrap gap-1.5'>
                        {game.game?.genres?.slice(0, 2).map((genre, i) => (
                            <span
                                key={i}
                                className='text-[10px] uppercase tracking-wider text-text-secondary font-medium px-1.5 py-0.5 rounded bg-white/5'
                            >
                                {genre}
                            </span>
                        ))}
                    </div>
                </div>

                <div className='flex items-center justify-between mt-auto pt-2 border-t border-white/5'>
                    <StatusBadge status={game.status} />
                    <div className='flex items-center gap-1 text-xs text-text-secondary font-medium'>
                        <span className='material-symbols-outlined text-[14px]'>schedule</span>
                        <span>{formatPlaytime(game.hours_played)}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                {showProgress &&
                    (game.status === 'currently_playing' ||
                        game.status === 'completed' ||
                        game.status === 'completed_100') && (
                        <div className='mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden'>
                            <div
                                className={`h-full rounded-full ${game.status === 'currently_playing'
                                    ? 'bg-accent-purple'
                                    : 'bg-accent-green'
                                    }`}
                                style={{ width: `${calculateProgress()}%` }}
                            />
                        </div>
                    )}
            </div>
        </motion.div>
    );
};

export default GameCard;
