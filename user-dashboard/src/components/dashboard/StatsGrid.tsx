import React from 'react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import {
    AppstoreOutlined,
    PlayCircleOutlined,
    CheckCircleOutlined,
    CalendarOutlined,
    StarOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    DollarOutlined,
} from '@ant-design/icons';
import type { DashboardStats } from '../../services/api';

interface StatsGridProps {
    stats: DashboardStats | null;
    loading?: boolean;
}

interface StatCardProps {
    icon: React.ReactNode;
    value: number;
    label: string;
    color: 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan';
    suffix?: string;
    prefix?: string;
    decimals?: number;
    delay: number;
    loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
    icon,
    value,
    label,
    color,
    suffix = '',
    prefix = '',
    decimals = 0,
    delay,
    loading,
}) => {
    if (loading) {
        return (
            <motion.div
                className={`stat-card ${color}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay * 0.1, duration: 0.4 }}
            >
                <div className="stat-card-icon">{icon}</div>
                <div className="skeleton skeleton-stat-value" />
                <div className="skeleton skeleton-stat-label" />
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`stat-card ${color}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
        >
            <div className="stat-card-icon">{icon}</div>
            <div className="stat-card-value">
                {prefix}
                <CountUp
                    end={value}
                    duration={1.5}
                    delay={delay * 0.1}
                    decimals={decimals}
                    separator=","
                />
                {suffix}
            </div>
            <div className="stat-card-label">{label}</div>
        </motion.div>
    );
};

const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => {
    const statCards = [
        {
            icon: <AppstoreOutlined style={{ color: '#7B61FF' }} />,
            value: stats?.totalGames || 0,
            label: 'Total Games',
            color: 'purple' as const,
        },
        {
            icon: <PlayCircleOutlined style={{ color: '#5DADE2' }} />,
            value: stats?.currentlyPlaying || 0,
            label: 'In Progress',
            color: 'blue' as const,
        },
        {
            icon: <CheckCircleOutlined style={{ color: '#4ECB71' }} />,
            value: (stats?.completedGames || 0) + (stats?.completed100 || 0),
            label: 'Completed',
            color: 'green' as const,
        },
        {
            icon: <CalendarOutlined style={{ color: '#FFB347' }} />,
            value: stats?.completedThisMonth || 0,
            label: 'Completed This Month',
            color: 'orange' as const,
        },
        {
            icon: <StarOutlined style={{ color: '#faad14' }} />,
            value: stats?.wantToPlay || 0,
            label: 'Wishlist',
            color: 'orange' as const,
        },
        {
            icon: <ClockCircleOutlined style={{ color: '#00D9FF' }} />,
            value: stats?.totalHoursPlayed || 0,
            label: 'Hours Played',
            color: 'cyan' as const,
            decimals: 1,
        },
        {
            icon: <TrophyOutlined style={{ color: '#FF6B9C' }} />,
            value: stats?.recentAchievementCount || 0,
            label: 'Achievements This Month',
            color: 'pink' as const,
        },
        {
            icon: <DollarOutlined style={{ color: '#4ECB71' }} />,
            value: stats?.collectionValueEstimate || 0,
            label: 'Collection Value',
            color: 'green' as const,
            prefix: '$',
            decimals: 0,
        },
    ];

    return (
        <div className="stats-grid">
            {statCards.map((card, index) => (
                <StatCard
                    key={card.label}
                    {...card}
                    delay={index}
                    loading={loading}
                />
            ))}
        </div>
    );
};

export default StatsGrid;
