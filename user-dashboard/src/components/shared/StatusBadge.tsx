import React from 'react';

export type GameStatus =
    | 'want_to_play'
    | 'currently_playing'
    | 'analysis_needed'
    | 'completed'
    | 'completed_100'
    | 'on_hold'
    | 'dropped';

interface StatusBadgeProps {
    status: GameStatus | string;
    minimal?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; border: string; icon: string }
> = {
    want_to_play: {
        label: 'Backlog',
        color: 'text-accent-blue',
        bg: 'bg-accent-blue/10',
        border: 'border-accent-blue/20',
        icon: 'schedule',
    },
    currently_playing: {
        label: 'Playing',
        color: 'text-accent-purple',
        bg: 'bg-accent-purple/10',
        border: 'border-accent-purple/20',
        icon: 'play_circle',
    },
    completed: {
        label: 'Completed',
        color: 'text-accent-green',
        bg: 'bg-accent-green/10',
        border: 'border-accent-green/20',
        icon: 'check_circle',
    },
    analysis_needed: {
        label: 'Analysis Needed',
        color: 'text-accent-orange',
        bg: 'bg-accent-orange/10',
        border: 'border-accent-orange/20',
        icon: 'science',
    },
    completed_100: {
        label: '100% Completed',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/20',
        icon: 'emoji_events',
    },
    on_hold: {
        label: 'On Hold',
        color: 'text-accent-orange',
        bg: 'bg-accent-orange/10',
        border: 'border-accent-orange/20',
        icon: 'pause_circle',
    },
    dropped: {
        label: 'Dropped',
        color: 'text-status-error',
        bg: 'bg-status-error/10',
        border: 'border-status-error/20',
        icon: 'cancel',
    },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    minimal = false,
    className = '',
    style,
}) => {
    const config = statusConfig[status] || {
        label: status,
        color: 'text-text-secondary',
        bg: 'bg-white/5',
        border: 'border-white/10',
        icon: 'help',
    };

    if (minimal) {
        return (
            <div
                className={`w-2 h-2 rounded-full ring-2 ring-opacity-50 ${config.bg.replace(
                    '/10',
                    ''
                )} ${className}`}
                style={style}
                title={config.label}
            />
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color} ${config.bg} ${config.border} ${className}`}
            style={style}
        >
            <span className='material-symbols-outlined text-[14px]'>{config.icon}</span>
            {config.label}
        </span>
    );
};

export default StatusBadge;
