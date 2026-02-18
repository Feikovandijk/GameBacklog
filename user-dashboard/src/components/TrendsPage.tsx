import React, { useState, useEffect } from 'react';
import { Row, Col, Table, Tag, Space, Button, message } from 'antd';
import {
    RiseOutlined,
    FireOutlined,
    PlusOutlined,
    PieChartOutlined,
    BarChartOutlined,
    LineChartOutlined
} from '@ant-design/icons';
import { Bar, Pie, Line } from '@ant-design/charts';
import type { TopSellerGame, PopularTag } from '../services/api';
import { gamesAPI, userGamesAPI } from '../services/api';
import './dashboard/dashboard.css';



const TrendsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [topSellers, setTopSellers] = useState<TopSellerGame[]>([]);
    const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [addingIds, setAddingIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sellersRes, tagsRes, analyticsRes] = await Promise.all([
                    gamesAPI.getTopSellers(),
                    gamesAPI.getPopularTags(10, 7),
                    gamesAPI.getAnalytics()
                ]);

                setTopSellers(sellersRes.data);
                setPopularTags(tagsRes.data);
                setAnalytics(analyticsRes.data);
            } catch (error) {
                console.error('Error fetching trends data:', error);
                message.error('Failed to load some trends data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddGame = async (game: TopSellerGame) => {
        const appId = game.steam_appid;
        setAddingIds(prev => ({ ...prev, [appId]: true }));
        try {
            await userGamesAPI.addGame({
                steam_appid: appId,
                status: 'want_to_play',
                priority: 1
            });
            message.success(`${game.name} added to your backlog!`);
        } catch (error) {
            console.error('Error adding game:', error);
            message.error(`${game.name} might already be in your backlog.`);
        } finally {
            setAddingIds(prev => ({ ...prev, [appId]: false }));
        }
    };

    // Chart configs
    const tagChartConfig = {
        data: popularTags.map(tag => ({
            name: tag.name,
            value: tag.totalPlayers,
        })),
        xField: 'name',
        yField: 'value',
        color: '#7B61FF',
        label: {
            position: 'middle',
            style: {
                fill: '#FFFFFF',
                opacity: 0.6,
            },
        },
        xAxis: {
            label: {
                autoHide: true,
                autoRotate: false,
            },
        },
    };

    const genrePieConfig = {
        appendPadding: 10,
        data: analytics?.genreDistribution || [],
        angleField: 'count',
        colorField: 'name',
        radius: 0.8,
        innerRadius: 0.6,
        label: {
            type: 'inner',
            offset: '-50%',
            content: '{value}',
            style: {
                textAlign: 'center',
                fontSize: 14,
            },
        },
        interactions: [{ type: 'element-selected' }, { type: 'element-active' }],
        statistic: {
            title: false,
            content: {
                style: {
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#fff',
                },
                content: 'Genres',
            },
        },
    };

    const releaseYearConfig = {
        data: Object.entries(analytics?.releaseYearDistribution || {})
            .map(([year, count]) => ({ year, count: count as number }))
            .sort((a, b) => Number(a.year) - Number(b.year)),
        xField: 'year',
        yField: 'count',
        smooth: true,
        color: '#00D9FF',
        area: {
            style: {
                fill: 'l(270) 0:#00D9FF 0.5:#7B61FF 1:#7B61FF',
            },
        },
    };

    const sellerColumns = [
        {
            title: 'Rank',
            dataIndex: 'rank',
            key: 'rank',
            width: 60,
            render: (rank: number) => <Tag color={rank <= 3 ? '#ff4d4f' : 'default'} style={{ fontWeight: 'bold' }}>#{rank}</Tag>
        },
        {
            title: 'Game',
            key: 'game',
            render: (game: TopSellerGame) => (
                <Space>
                    <img src={game.header_image} alt={game.name} style={{ width: 100, borderRadius: 4 }} />
                    <div style={{ maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{game.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{game.developers[0]}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Genres',
            dataIndex: 'genres',
            key: 'genres',
            render: (genres: string[]) => (
                <Space wrap>
                    {genres.slice(0, 2).map(g => <Tag key={g} color="blue">{g}</Tag>)}
                </Space>
            )
        },
        {
            title: 'Price',
            key: 'price',
            render: (game: TopSellerGame) => (
                <span style={{ fontWeight: 600, color: '#4ECB71' }}>
                    {game.price_final === 0 ? 'Free' : `$${(game.price_final / 100).toFixed(2)}`}
                </span>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (game: TopSellerGame) => (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={addingIds[game.steam_appid]}
                    onClick={() => handleAddGame(game)}
                >
                    Add
                </Button>
            )
        }
    ];

    return (
        <div className="dashboard-container">
            <div className="welcome-header animate-fade-in-up">
                <div className="stat-card-icon purple">
                    <RiseOutlined />
                </div>
                <div className="welcome-text">
                    <h1>Market Trends</h1>
                    <p>Real-time Steam market insights and global trends</p>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Market Overview Charts */}
                <Col xs={24} lg={16}>
                    <div className="dashboard-card animate-fade-in-up animate-delay-1" style={{ height: '100%' }}>
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <BarChartOutlined className="icon" style={{ color: '#7B61FF' }} />
                                Popular Tags by Active Players
                            </h3>
                        </div>
                        <div style={{ height: 350 }}>
                            <Bar {...tagChartConfig} />
                        </div>
                    </div>
                </Col>

                <Col xs={24} lg={8}>
                    <div className="dashboard-card animate-fade-in-up animate-delay-2" style={{ height: '100%' }}>
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <PieChartOutlined className="icon" style={{ color: '#4ECB71' }} />
                                Global Genre Distribution
                            </h3>
                        </div>
                        <div style={{ height: 350 }}>
                            <Pie {...genrePieConfig} />
                        </div>
                    </div>
                </Col>

                {/* Release Volume Trend */}
                <Col xs={24}>
                    <div className="dashboard-card animate-fade-in-up animate-delay-3">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <LineChartOutlined className="icon" style={{ color: '#00D9FF' }} />
                                Historical Release Volume
                            </h3>
                        </div>
                        <div style={{ height: 300 }}>
                            <Line {...releaseYearConfig} />
                        </div>
                    </div>
                </Col>

                {/* Weekly Top Sellers */}
                <Col xs={24}>
                    <div className="dashboard-card animate-fade-in-up animate-delay-4">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <FireOutlined className="icon" style={{ color: '#ff4d4f' }} />
                                Global Top Sellers (Most Played Today)
                            </h3>
                        </div>
                        <Table
                            dataSource={topSellers}
                            columns={sellerColumns}
                            rowKey="steam_appid"
                            loading={loading}
                            pagination={false}
                            className="custom-table"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default TrendsPage;
