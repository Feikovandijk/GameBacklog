import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Tag, Button, message } from 'antd';
import {
    RiseOutlined,
    PlusOutlined,
    PieChartOutlined,
    BarChartOutlined,
    LineChartOutlined,
    TeamOutlined,
    TrophyOutlined,
    TagsOutlined,
    RocketOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { Area } from '@ant-design/charts';
import { motion } from 'framer-motion';
import type { PopularTag, Game } from '../services/api';
import { gamesAPI, userGamesAPI } from '../services/api';
import './dashboard/dashboard.css';

interface GameCardBadge { label: string; style: React.CSSProperties }
interface GameCardSubline { icon: React.ReactNode; text: string; color: string }

interface GameCardGridProps {
    games: Game[];
    loading: boolean;
    addingIds: Record<number, boolean>;
    onAdd: (game: Game) => void;
    badge: (game: Game, index: number) => GameCardBadge | null;
    subline: (game: Game) => GameCardSubline | null;
}

const GameCardGrid: React.FC<GameCardGridProps> = ({ games, loading, addingIds, onAdd, badge, subline }) => {
    const skeletons = Array.from({ length: 6 });
    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {skeletons.map((_, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, height: 260, animation: 'skeleton-shimmer 1.5s infinite' }} />
                ))}
            </div>
        );
    }
    if (games.length === 0) {
        return <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No data available</div>;
    }
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {games.map((game, i) => {
                const b = badge(game, i);
                const s = subline(game);
                return (
                    <div
                        key={game.steam_appid}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.4)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                    >
                        <div style={{ position: 'relative', height: 120 }}>
                            {game.header_image ? (
                                <img
                                    src={game.header_image}
                                    alt={game.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={e => {
                                        const el = e.target as HTMLImageElement;
                                        el.style.display = 'none';
                                        if (el.parentElement) {
                                            el.parentElement.style.background = 'linear-gradient(135deg, #1F2943, #161E32)';
                                        }
                                    }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1F2943, #161E32)' }} />
                            )}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)' }} />
                            {b && <div style={{ position: 'absolute', top: 8, left: 8, ...b.style }}>{b.label}</div>}
                        </div>
                        <div style={{ padding: 12 }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, lineHeight: 1.3, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {game.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {game.developers?.[0]}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                {game.genres?.slice(0, 2).map(g => (
                                    <Tag key={g} style={{ fontSize: 10, padding: '0 5px', borderRadius: 4, background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', border: 'none', fontWeight: 600, margin: 0 }}>{g}</Tag>
                                ))}
                            </div>
                            {s && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: s.color, marginBottom: 10 }}>
                                    {s.icon}<span>{s.text}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#4ECB71' }}>
                                    {game.price_final === 0 ? 'Free' : `$${(game.price_final / 100).toFixed(2)}`}
                                </span>
                                <Button type="primary" size="small" icon={<PlusOutlined />} loading={addingIds[game.steam_appid]} onClick={() => onAdd(game)}
                                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #00A3FF)', border: 'none', borderRadius: 8, fontSize: 12 }}>
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const TrendsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
    const [analytics, setAnalytics] = useState<{
        genreDistribution: { name: string; count: number }[];
        releaseYearDistribution: Record<string, number>;
    } | null>(null);
    const [trendingGames, setTrendingGames] = useState<Game[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
    const [releasesPerMonth, setReleasesPerMonth] = useState<{ month: string; count: number }[]>([]);
    const [addingIds, setAddingIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchTags = async () => {
                    try {
                        const res = await gamesAPI.getPopularTags(10, 30);
                        setPopularTags(res.data);
                    } catch (e) {
                        console.error('Failed to fetch popular tags:', e);
                    }
                };

                const fetchAnalytics = async () => {
                    try {
                        const res = await gamesAPI.getAnalytics();
                        setAnalytics(res.data);
                    } catch (e) {
                        console.error('Failed to fetch analytics:', e);
                    }
                };

                const fetchTrending = async () => {
                    try {
                        // Games released in last 30 days, ordered by live player count
                        const res = await gamesAPI.getTrendingGames(12, 30);
                        setTrendingGames(res.data);
                    } catch (e) {
                        console.error('Failed to fetch trending games:', e);
                    }
                };

                const fetchUpcoming = async () => {
                    try {
                        const res = await gamesAPI.getUpcomingGames(12);
                        setUpcomingGames(res.data);
                    } catch (e) {
                        console.error('Failed to fetch upcoming games:', e);
                    }
                };

                const fetchReleasesPerMonth = async () => {
                    try {
                        const res = await gamesAPI.getReleasesPerMonth(24);
                        setReleasesPerMonth(res.data);
                    } catch (e) {
                        console.error('Failed to fetch releases per month:', e);
                    }
                };

                await Promise.all([fetchTags(), fetchAnalytics(), fetchTrending(), fetchUpcoming(), fetchReleasesPerMonth()]);
            } catch (error) {
                console.error('Error fetching trends data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddGame = async (game: Game) => {
        const appId = game.steam_appid;
        setAddingIds(prev => ({ ...prev, [appId]: true }));
        try {
            await userGamesAPI.addGame({
                steam_appid: appId,
                status: 'want_to_play',
                priority: 1,
            });
            message.success(`${game.name} added to your backlog!`);
        } catch (error) {
            console.error('Error adding game:', error);
            message.error(`${game.name} might already be in your backlog.`);
        } finally {
            setAddingIds(prev => ({ ...prev, [appId]: false }));
        }
    };

    const topGenreShare = useMemo(() => {
        const dist = analytics?.genreDistribution;
        if (!dist || dist.length === 0) return null;
        const total = dist.reduce((s: number, g: { count: number }) => s + g.count, 0);
        const top = dist[0];
        if (!top || total === 0) return null;
        return { name: top.name, pct: Math.round((top.count / total) * 100) };
    }, [analytics]);

    const formatPlayerCount = (count?: number): string => {
        if (count == null) return '—';
        if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
        if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
        return count.toLocaleString();
    };

    const getRankStyle = (rank: number): React.CSSProperties => ({
        background: rank === 1 ? '#FFB347' : rank <= 3 ? '#8B5CF6' : 'rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: '6px',
    });

    const maxTagPlayers = popularTags.length > 0 ? popularTags[0].totalPlayers : 1;

    const releaseAreaConfig = {
        data: releasesPerMonth,
        xField: 'month',
        yField: 'count',
        theme: 'classicDark',
        smooth: true,
        style: {
            stroke: '#00D9FF',
            lineWidth: 2,
            fill: '#00D9FF',
            fillOpacity: 0.12,
        },
        axis: {
            x: {
                labelFill: 'rgba(255,255,255,0.6)',
                labelFontSize: 10,
                gridStroke: 'rgba(255,255,255,0.05)',
                labelAutoRotate: true,
            },
            y: {
                labelFill: 'rgba(255,255,255,0.6)',
                labelFontSize: 11,
                gridStroke: 'rgba(255,255,255,0.08)',
            },
        },
    };

    const fadeUp = (delay = 0) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay },
    });

    const summaryStats = [
        {
            icon: <TagsOutlined />,
            color: 'purple',
            label: 'Most Played Tag',
            value: popularTags[0]?.name ?? '—',
            sub: popularTags[0] ? `${formatPlayerCount(popularTags[0].totalPlayers)} players` : undefined,
        },
        {
            icon: <TrophyOutlined />,
            color: 'orange',
            label: '#1 Trending This Month',
            value: trendingGames[0]?.name ?? '—',
            sub: trendingGames[0]?.current_players != null
                ? `${formatPlayerCount(trendingGames[0].current_players)} playing`
                : undefined,
        },
        {
            icon: <PieChartOutlined />,
            color: 'cyan',
            label: 'Top Genre on Steam',
            value: topGenreShare ? `${topGenreShare.name}` : '—',
            sub: topGenreShare ? `${topGenreShare.pct}% of all games` : undefined,
        },
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="welcome-header">
                <div className="stat-card-icon purple">
                    <RiseOutlined />
                </div>
                <div className="welcome-text">
                    <h1>Market Trends</h1>
                    <p>Real-time Steam market insights and global trends</p>
                </div>
            </motion.div>

            {/* Summary stats row */}
            <motion.div {...fadeUp(0.1)}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {summaryStats.map(stat => (
                        <Col key={stat.label} xs={24} sm={8}>
                            <div className={`stat-card ${stat.color}`}>
                                <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
                                <div
                                    className="stat-card-value"
                                    style={{
                                        fontSize: stat.value.length > 12 ? '15px' : undefined,
                                        lineHeight: 1.2,
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                    }}
                                >
                                    {stat.value}
                                </div>
                                <div className="stat-card-label">{stat.label}</div>
                                {stat.sub && (
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'rgba(255,255,255,0.45)',
                                        marginTop: '2px',
                                        fontWeight: 500,
                                    }}>
                                        {stat.sub}
                                    </div>
                                )}
                            </div>
                        </Col>
                    ))}
                </Row>
            </motion.div>

            {/* Charts row */}
            <motion.div {...fadeUp(0.2)}>
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={16}>
                        <div className="dashboard-card" style={{ height: '100%' }}>
                            <div className="dashboard-card-header">
                                <h3 className="dashboard-card-title">
                                    <BarChartOutlined className="icon" style={{ color: '#8B5CF6' }} />
                                    Popular Tags by Active Players
                                </h3>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                {popularTags.map((tag, i) => (
                                    <div key={tag.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <div style={{ width: 90, textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.75)', flexShrink: 0 }}>
                                            {tag.name}
                                        </div>
                                        <div style={{ flex: 1, height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(tag.totalPlayers / maxTagPlayers) * 100}%`,
                                                height: '100%',
                                                background: `rgba(139,92,246,${1 - i * 0.07})`,
                                                borderRadius: 4,
                                                transition: 'width 0.6s ease',
                                            }} />
                                        </div>
                                        <div style={{ width: 52, fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                                            {formatPlayerCount(tag.totalPlayers)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Col>

                    <Col xs={24} lg={8}>
                        <div className="dashboard-card" style={{ height: '100%' }}>
                            <div className="dashboard-card-header">
                                <h3 className="dashboard-card-title">
                                    <PieChartOutlined className="icon" style={{ color: '#00E5BC' }} />
                                    Genre Breakdown
                                </h3>
                            </div>
                            <div style={{ padding: '4px 0' }}>
                                {(analytics?.genreDistribution ?? []).map((g: { name: string; count: number }, i: number) => {
                                    const COLORS = ['#8B5CF6', '#00A3FF', '#00E5BC', '#FFB347', '#FF6B9C', '#00D9FF'];
                                    const total = (analytics?.genreDistribution ?? []).reduce((s: number, x: { count: number }) => s + x.count, 0);
                                    const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                                    const color = COLORS[i % COLORS.length];
                                    return (
                                        <div key={g.name} style={{ marginBottom: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{g.name}</span>
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Col>
                </Row>
            </motion.div>

            {/* Release year area chart */}
            <motion.div {...fadeUp(0.3)} style={{ marginBottom: 24 }}>
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h3 className="dashboard-card-title">
                            <LineChartOutlined className="icon" style={{ color: '#00D9FF' }} />
                            Release Volume per Month (last 24 months)
                        </h3>
                    </div>
                    <div style={{ height: 280, background: 'transparent' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Area {...(releaseAreaConfig as any)} />
                    </div>
                </div>
            </motion.div>

            {/* Up & Coming — trending new releases */}
            <motion.div {...fadeUp(0.4)} style={{ marginBottom: 24 }}>
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h3 className="dashboard-card-title">
                            <RocketOutlined className="icon" style={{ color: '#8B5CF6' }} />
                            Up &amp; Coming
                        </h3>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                            New releases with the most live players this month
                        </span>
                    </div>
                    <GameCardGrid
                        games={trendingGames}
                        loading={loading}
                        addingIds={addingIds}
                        onAdd={handleAddGame}
                        badge={(_game, i) => i < 3
                            ? { label: `#${i + 1}`, style: getRankStyle(i + 1) }
                            : null
                        }
                        subline={game => game.current_players != null
                            ? { icon: <TeamOutlined />, text: `${formatPlayerCount(game.current_players)} playing`, color: '#00E5BC' }
                            : null
                        }
                    />
                </div>
            </motion.div>

            {/* Coming Soon */}
            <motion.div {...fadeUp(0.5)}>
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h3 className="dashboard-card-title">
                            <CalendarOutlined className="icon" style={{ color: '#FFB347' }} />
                            Coming Soon
                        </h3>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                            Releasing in the next 60 days · sorted by community interest
                        </span>
                    </div>
                    <GameCardGrid
                        games={upcomingGames}
                        loading={loading}
                        addingIds={addingIds}
                        onAdd={handleAddGame}
                        badge={game => {
                            if (!game.release_date) return null;
                            const days = Math.ceil((new Date(game.release_date).getTime() - Date.now()) / 86_400_000);
                            return {
                                label: days <= 7 ? `${days}d` : days <= 30 ? `${Math.ceil(days / 7)}w` : `${Math.ceil(days / 30)}mo`,
                                style: {
                                    background: days <= 7 ? '#ff4d4f' : days <= 30 ? '#FFB347' : 'rgba(255,255,255,0.15)',
                                    color: '#fff', fontSize: '11px', fontWeight: 700,
                                    padding: '2px 7px', borderRadius: '6px',
                                },
                            };
                        }}
                        subline={game => game.release_date
                            ? {
                                icon: <CalendarOutlined />,
                                text: new Date(game.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                color: '#FFB347',
                              }
                            : null
                        }
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default TrendsPage;
