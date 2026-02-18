import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import type { UserGame } from '../../services/api';

interface GameCardProps {
    game: UserGame;
    onClick?: () => void;
    onEdit?: (e: React.MouseEvent) => void;
    className?: string;
    showProgress?: boolean;
    showAnalysisIndicators?: boolean;
}

const gradients = [
    'from-indigo-900 to-purple-900',
    'from-slate-800 to-gray-700',
    'from-emerald-900 to-teal-900',
    'from-blue-900 to-cyan-900',
    'from-red-900 to-orange-900',
    'from-violet-900 to-fuchsia-900',
    'from-sky-900 to-blue-900',
    'from-amber-900 to-yellow-900',
];

const getGradient = (appid: number) => {
    return gradients[appid % gradients.length];
};

/**
 * Build an ordered list of image URLs to try for a game.
 * 1. DB-stored header_image (most accurate — may use a custom filename from PICS)
 * 2. Steam CDN header.jpg (standard path, works for most games)
 * 3. Steam CDN capsule (alternate size)
 * Deduplicates so we don't retry the same URL.
 */
const getImageSources = (game: UserGame): string[] => {
    const seen = new Set<string>();
    const sources: string[] = [];
    const add = (url: string) => {
        if (!seen.has(url)) {
            seen.add(url);
            sources.push(url);
        }
    };
    if (game.game?.header_image && game.game.header_image.startsWith('http')) {
        add(game.game.header_image);
    }
    if (game.steam_appid) {
        add(
            `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`
        );
        add(
            `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/capsule_616x353.jpg`
        );
    }
    return sources;
};

const GameCard: React.FC<GameCardProps> = ({
    game,
    onClick,
    onEdit,
    className = '',
    showAnalysisIndicators = false,
}) => {
    const [sourceIndex, setSourceIndex] = useState(0);
    const currentGameIdRef = useRef(game.id);
    const sources = getImageSources(game);

    useEffect(() => {
        if (currentGameIdRef.current !== game.id) {
            setSourceIndex(0);
            currentGameIdRef.current = game.id;
        }
    }, [game.id]);

    const allFailed = sourceIndex >= sources.length;

    const formatPlaytime = (hours: number | undefined) => {
        if (!hours) return '0h';
        return hours < 1
            ? `${Math.round(hours * 60)}m`
            : `${hours.toFixed(1)}h`;
    };

    const progress = game.completion_percentage || 0;
    const showProgressBar =
        game.status === 'currently_playing' ||
        game.status === 'analysis_needed' ||
        game.status === 'completed' ||
        game.status === 'completed_100';

    const imageSrc = !allFailed ? sources[sourceIndex] : null;

    return (
        <div
            className={`group relative bg-surface-dark border border-border-dark rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${className}`}
            onClick={onClick}
        >
            {/* Cover Image with Gradient Background */}
            <div
                className={`relative h-36 bg-gradient-to-br ${getGradient(game.steam_appid || 0)} overflow-hidden`}
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={game.game?.name}
                        className='absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
                        loading='lazy'
                        onError={() => setSourceIndex(prev => prev + 1)}
                    />
                ) : null}

                {/* Subtle bottom gradient for badge readability */}
                <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent' />

                {/* Status badge - bottom left */}
                <div className='absolute bottom-3 left-3'>
                    <StatusBadge status={game.status} />
                </div>

                {/* Playtime - bottom right */}
                <div className='absolute bottom-3 right-3'>
                    <span className='inline-flex items-center gap-1 bg-background-dark/70 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full border border-white/10'>
                        <span className='material-symbols-outlined text-[12px]'>
                            schedule
                        </span>
                        {formatPlaytime(game.hours_played)}
                    </span>
                </div>

                {/* Edit button overlay */}
                {onEdit && (
                    <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                onEdit(e);
                            }}
                            className='p-1.5 bg-background-dark/60 hover:bg-background-dark/80 backdrop-blur-sm rounded-lg text-white transition-colors border border-white/10'
                        >
                            <span className='material-symbols-outlined text-[16px]'>
                                edit
                            </span>
                        </button>
                    </div>
                )}

                {/* Fallback icon when no image */}
                {allFailed && (
                    <div className='absolute inset-0 flex items-center justify-center'>
                        <span className='material-symbols-outlined text-[48px] text-white/20'>
                            sports_esports
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className='p-4 flex flex-col gap-2'>
                <div>
                    <h3
                        className='font-bold text-white text-sm leading-tight mb-1.5 line-clamp-1 group-hover:text-primary transition-colors'
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

                {/* Analysis Indicators */}
                {showAnalysisIndicators &&
                    (game.priority > 0 ||
                        (game.user_rating != null && game.user_rating > 0) ||
                        game.is_favorite ||
                        (game.user_tags && game.user_tags.length > 0) ||
                        (game.user_notes && game.user_notes.trim())) && (
                        <div className='flex items-center gap-1.5 flex-wrap mt-0.5'>
                            {game.priority > 0 && (
                                <span
                                    className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-purple/20 text-accent-purple text-[10px] font-bold'
                                    title={`Priority ${game.priority}`}
                                >
                                    {game.priority}
                                </span>
                            )}
                            {game.user_rating != null && game.user_rating > 0 && (
                                <span
                                    className='inline-flex items-center gap-px'
                                    title={`Rated ${game.user_rating}/5`}
                                >
                                    {Array.from(
                                        { length: game.user_rating },
                                        (_, i) => (
                                            <span
                                                key={i}
                                                className='material-symbols-outlined text-[10px] text-accent-yellow'
                                                style={{
                                                    fontVariationSettings:
                                                        "'FILL' 1",
                                                }}
                                            >
                                                star
                                            </span>
                                        )
                                    )}
                                </span>
                            )}
                            {game.is_favorite && (
                                <span
                                    className='material-symbols-outlined text-[12px] text-red-500'
                                    style={{
                                        fontVariationSettings: "'FILL' 1",
                                    }}
                                    title='Favorite'
                                >
                                    favorite
                                </span>
                            )}
                            {game.user_tags &&
                                game.user_tags.length > 0 &&
                                game.user_tags.slice(0, 2).map((tag, i) => (
                                    <span
                                        key={i}
                                        className='text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary'
                                    >
                                        {tag}
                                    </span>
                                ))}
                            {game.user_tags && game.user_tags.length > 2 && (
                                <span className='text-[8px] text-text-secondary'>
                                    +{game.user_tags.length - 2}
                                </span>
                            )}
                            {game.user_notes && game.user_notes.trim() && (
                                <span
                                    className='material-symbols-outlined text-[12px] text-text-secondary'
                                    title='Has notes'
                                >
                                    description
                                </span>
                            )}
                        </div>
                    )}

                {/* Progress bar */}
                {showProgressBar && (
                    <div className='mt-1'>
                        <div className='flex items-center justify-between text-[10px] text-text-secondary mb-1'>
                            <span>Progress</span>
                            <span className='text-primary font-bold'>
                                {progress}%
                            </span>
                        </div>
                        <div className='h-1 w-full bg-border-dark rounded-full overflow-hidden'>
                            <div
                                className='h-full bg-primary rounded-full shadow-[0_0_6px_rgba(0,229,188,0.4)]'
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameCard;
