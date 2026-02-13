import React, { useState, useEffect, useRef } from 'react';
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
    const errorCountRef = useRef(0);
    const currentGameIdRef = useRef(game.id);

    useEffect(() => {
        if (currentGameIdRef.current !== game.id) {
            setImgError(false);
            errorCountRef.current = 0;
            currentGameIdRef.current = game.id;
        }
    }, [game.id]);

    const formatPlaytime = (hours: number | undefined) => {
        if (!hours) return '0h';
        return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
    };

    const calculateProgress = () => {
        return game.completion_percentage || 0;
    };

    return (
        <div
            className={`group relative bg-surface-dark border border-border-dark rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${className}`}
            onClick={onClick}
        >
            {/* Cover Image */}
            <div className='relative aspect-video bg-background-dark overflow-hidden'>
                {!imgError && game.steam_appid ? (
                    <img
                        src={
                            game.game?.header_image &&
                                game.game.header_image.startsWith('http')
                                ? game.game.header_image
                                : `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`
                        }
                        alt={game.game?.name}
                        className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        loading='lazy'
                        onError={() => {
                            errorCountRef.current += 1;
                            if (errorCountRef.current > 2) {
                                setImgError(true);
                            }
                        }}
                    />
                ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background-dark to-accent-purple/20 p-4 text-center'>
                        <span className='material-symbols-outlined text-[48px] text-primary/40 mb-2'>
                            sports_esports
                        </span>
                        <span className='font-bold text-text-secondary text-sm line-clamp-2'>
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
                        game.status === 'analysis_needed' ||
                        game.status === 'completed' ||
                        game.status === 'completed_100') && (
                        <div className='mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden'>
                            <div
                                className={`h-full rounded-full ${game.status === 'currently_playing'
                                    ? 'bg-accent-purple'
                                    : game.status === 'analysis_needed'
                                        ? 'bg-accent-orange'
                                        : 'bg-accent-green'
                                    }`}
                                style={{ width: `${calculateProgress()}%` }}
                            />
                        </div>
                    )}
            </div>
        </div>
    );
};

export default GameCard;
