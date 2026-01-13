import React from 'react';
import { Tag } from 'antd';
import {
    ClockCircleOutlined,
    PlayCircleOutlined,
    CheckCircleOutlined,
    StopOutlined,
    PauseCircleOutlined,
    TrophyOutlined,
} from '@ant-design/icons';

export type GameStatus =
    | 'want_to_play'
    | 'currently_playing'
    | 'completed'
    | 'completed_100'
    | 'on_hold'
    | 'dropped';

interface StatusBadgeProps {
    status: GameStatus | string;
    minimal?: boolean; // If true, only shows icon or dot
    className?: string;
    style?: React.CSSProperties;
}

const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode; bg: string; border: string }
> = {
    want_to_play: {
        label: 'Backlog',
        color: '#5DADE2',
        bg: 'rgba(93, 173, 226, 0.1)',
        border: 'rgba(93, 173, 226, 0.3)',
        icon: <ClockCircleOutlined />,
    },
    currently_playing: {
        label: 'Playing',
        color: '#7B61FF',
        bg: 'rgba(123, 97, 255, 0.1)',
        border: 'rgba(123, 97, 255, 0.3)',
        icon: <PlayCircleOutlined />,
    },
    completed: {
        label: 'Completed',
        color: '#4ECB71',
        bg: 'rgba(78, 203, 113, 0.1)',
        border: 'rgba(78, 203, 113, 0.3)',
        icon: <CheckCircleOutlined />,
    },
    completed_100: {
        label: '100% Completed',
        color: '#FFD700',
        bg: 'rgba(255, 215, 0, 0.1)',
        border: 'rgba(255, 215, 0, 0.3)',
        icon: <TrophyOutlined />,
    },
    on_hold: {
        label: 'On Hold',
        color: '#FFB347',
        bg: 'rgba(255, 179, 71, 0.1)',
        border: 'rgba(255, 179, 71, 0.3)',
        icon: <PauseCircleOutlined />,
    },
    dropped: {
        label: 'Dropped',
        color: '#FF6B6B',
        bg: 'rgba(255, 107, 107, 0.1)',
        border: 'rgba(255, 107, 107, 0.3)',
        icon: <StopOutlined />,
    },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    minimal = false,
    className,
    style,
}) => {
    const config = statusConfig[status] || {
        label: status,
        color: '#888',
        bg: 'rgba(136, 136, 136, 0.1)',
        border: 'rgba(136, 136, 136, 0.3)',
        icon: null,
    };

    if (minimal) {
        return (
            <div
                className={className}
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: config.color,
                    boxShadow: `0 0 5px ${config.color}`,
                    ...style,
                }}
                title={config.label}
            />
        );
    }

    return (
        <Tag
            icon={config.icon}
            className={className}
            style={{
                color: config.color,
                background: config.bg,
                borderColor: config.border,
                borderRadius: '12px',
                padding: '0 10px',
                height: '24px',
                lineHeight: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                ...style,
            }}
        >
            {config.label}
        </Tag>
    );
};

export default StatusBadge;
