import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import {
    PieChartOutlined,
    BarChartOutlined,
    DashboardOutlined,
    TrophyOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DatabaseOutlined
} from '@ant-design/icons';
import { Pie, Bar, Column } from '@ant-design/charts';
import { userGamesAPI } from '../services/api';
import type { DashboardStats, UserGame } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AnalysisPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analysisNeededGames, setAnalysisNeededGames] = useState<UserGame[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, gamesRes] = await Promise.all([
                    userGamesAPI.getDashboardStats(),
                    userGamesAPI.get({ status: 'analysis_needed', limit: 10 })
                ]);
                setStats(statsRes.data);
                setAnalysisNeededGames(gamesRes.data.documents);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // --- Charts Configuration ---

    // 1. Library Status Distribution (Pie Chart)
    const statusData = stats
        ? [
            { type: 'Playing', value: stats.currentlyPlaying },
            { type: 'Backlog (To Play)', value: stats.wantToPlay },
            { type: 'Completed', value: stats.completedGames },
            { type: 'Completed 100%', value: stats.completed100 },
            { type: 'On Hold', value: stats.onHold },
            { type: 'Dropped', value: stats.dropped },
        ].filter((item) => item.value > 0)
        : [];

    const statusConfig = {
        appendPadding: 10,
        data: statusData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        innerRadius: 0.6,
        label: {
            type: 'outer',
            content: '{name} {percentage}',
        },
        interactions: [{ type: 'element-active' }],
        statistic: {
            title: false,
            content: {
                style: {
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '18px',
                    color: '#fff',
                },
                content: 'Total\n' + (stats?.totalGames || 0),
            },
        },
        color: [
            '#4ECB71', // Playing (Green)
            '#7B61FF', // Backlog (Purple)
            '#00D9FF', // Completed (Cyan)
            '#FFD700', // 100% (Gold)
            '#FF9F43', // On Hold (Orange)
            '#FF4D4F', // Dropped (Red)
        ],
        legend: {
            color: {
                title: false,
                position: 'right',
                rowPadding: 5,
            },
        },
    };

    // 2. Top Genres (Bar Chart)
    const genreData = stats?.topGenres || [];

    const genreConfig = {
        data: genreData,
        xField: 'count',
        yField: 'name',
        seriesField: 'name',
        legend: false,
        color: '#7B61FF',
        label: {
            position: 'middle',
            style: {
                fill: '#FFFFFF',
                opacity: 0.6,
            },
        },
        barBackground: {
            style: {
                fill: 'rgba(0,0,0,0.1)',
            },
        },
        interactive: false,
    };

    // 3. Completion History (Simple Column Chart Mockup - API currently returns static periods)
    // We can visualize the 'completedThis...' stats in a simple bar for now
    const completionData = stats ? [
        { period: 'This Week', value: stats.completedThisWeek },
        { period: 'This Month', value: stats.completedThisMonth },
        { period: 'This Year', value: stats.completedThisYear },
    ] : [];

    const completionConfig = {
        data: completionData,
        xField: 'period',
        yField: 'value',
        color: '#00D9FF',
        columnWidthRatio: 0.6,
        label: {
            position: 'middle',
            style: {
                fill: '#FFFFFF',
                opacity: 0.6,
            },
        },
    };


    if (loading) {
        return (
            <div className='flex h-full w-full items-center justify-center'>
                <div className='h-12 w-12 animate-spin rounded-full border-4 border-surface-dark border-t-primary' />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-lg bg-surface-hover flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                        <DashboardOutlined style={{ fontSize: '20px' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analysis Headquarters</h1>
                </div>
                <p className="text-text-secondary">Your personal space for game analysis, insights, and data collection.</p>
            </div>

            {/* Top High-Level Stats Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex items-center gap-4 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <DatabaseOutlined style={{ fontSize: '24px' }} />
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs uppercase font-bold tracking-wider">Total Value</p>
                            <h3 className="text-2xl font-bold text-white">${stats?.collectionValueEstimate?.toFixed(2) || '0.00'}</h3>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex items-center gap-4 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <ClockCircleOutlined style={{ fontSize: '24px' }} />
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs uppercase font-bold tracking-wider">Total Playtime</p>
                            <h3 className="text-2xl font-bold text-white">{Math.round(stats?.totalHoursPlayed || 0)}h</h3>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex items-center gap-4 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <CheckCircleOutlined style={{ fontSize: '24px' }} />
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs uppercase font-bold tracking-wider">Completion Rate</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.completionPercentage || 0}%</h3>
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex items-center gap-4 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <TrophyOutlined style={{ fontSize: '24px' }} />
                        </div>
                        <div>
                            <p className="text-text-secondary text-xs uppercase font-bold tracking-wider">100% Completed</p>
                            <h3 className="text-2xl font-bold text-white">{stats?.completed100 || 0}</h3>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Charts Section */}
            <Row gutter={[24, 24]}>
                {/* Library Status Dist */}
                <Col xs={24} lg={12} xl={8}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <PieChartOutlined className="text-primary" />
                            Library Status
                        </h3>
                        <div className="flex-1 min-h-[300px]">
                            {/* @ts-ignore */}
                            <Pie {...statusConfig} />
                        </div>
                    </div>
                </Col>

                {/* Genre Distribution */}
                <Col xs={24} lg={12} xl={8}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <BarChartOutlined className="text-accent-blue" />
                            Top Genres
                        </h3>
                        <div className="flex-1 min-h-[300px]">
                            {/* @ts-ignore */}
                            <Bar {...genreConfig} />
                        </div>
                    </div>
                </Col>

                {/* Completion Velocity */}
                <Col xs={24} lg={12} xl={8}>
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <TrophyOutlined className="text-accent-purple" />
                            Completion Velocity
                        </h3>
                        <div className="flex-1 min-h-[300px]">
                            {/* @ts-ignore */}
                            <Column {...completionConfig} />
                        </div>
                        <div className="mt-4 pt-4 border-t border-border-dark text-center">
                            <p className="text-sm text-text-secondary">
                                Avg time to beat: <span className="text-white font-bold">{Math.round(stats?.avgHoursPerCompletion || 0)}h</span>
                            </p>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Analysis Needed Section */}
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <DatabaseOutlined className="text-accent-blue" />
                        Pending Analysis
                    </h3>
                    <span className="text-xs text-text-secondary bg-surface-hover px-2 py-1 rounded-lg">
                        {analysisNeededGames.length} games waiting
                    </span>
                </div>

                {analysisNeededGames.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysisNeededGames.map(game => (
                            <div
                                key={game.id}
                                onClick={() => navigate(`/games?edit=${game.id}`)}
                                className="p-4 bg-background-dark/50 rounded-xl border border-border-dark hover:border-primary/50 cursor-pointer transition-all group flex gap-4"
                            >
                                <img
                                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
                                    alt={game.game?.name}
                                    className="w-24 h-14 object-cover rounded-lg"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold truncate group-hover:text-primary transition-colors">
                                        {game.game?.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-text-secondary flex items-center gap-1">
                                            <ClockCircleOutlined />
                                            {game.hours_played}h played
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DashboardOutlined />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary bg-background-dark/30 rounded-xl border border-dashed border-border-dark">
                        <p>No games currently marked as "Analysis Needed".</p>
                        <button
                            onClick={() => navigate('/games')}
                            className="mt-2 text-primary hover:underline text-sm font-bold"
                        >
                            Go to Library
                        </button>
                    </div>
                )}
            </div>

            {/* Detailed Metrics Placeholder */}

        </div>
    );
};

export default AnalysisPage;
