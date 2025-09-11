import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Typography } from 'antd';
import { AreaChartOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { userGamesAPI } from '../services/api';
import type { UserStats } from '../services/api';
import GameCompletionChart from './GameCompletionChart';
import RecentActivity from './RecentActivity';
import RecentlyPlayed from './RecentlyPlayed';
import SteamTopSellers from './SteamTopSellers';
import CurrentlyPlaying from './CurrentlyPlaying';

const { Title } = Typography;

const iconStyle = {
    fontSize: '24px',
    color: '#7B61FF',
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    padding: '8px',
    borderRadius: '8px'
};

const DashboardStats: React.FC<{ stats: UserStats | null }> = ({ stats }) => (
     <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
            <Card>
                <Statistic 
                    title="Total Games" 
                    value={stats?.totalGames || 0}
                    prefix={<AreaChartOutlined style={iconStyle} />}
                />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card>
                 <Statistic 
                    title="Games In Progress" 
                    value={stats?.currentlyPlaying || 0}
                    prefix={<ClockCircleOutlined style={iconStyle} />}
                />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card>
                 <Statistic 
                    title="Games Completed" 
                    value={stats?.completedGames || 0}
                    prefix={<CheckCircleOutlined style={iconStyle} />}
                />
            </Card>
        </Col>
    </Row>
);

const DashboardOverview = () => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await userGamesAPI.getStats();
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ marginBottom: '24px' }}>Dashboard Overview</Title>
            <Row gutter={[24, 24]}>
                <Col xs={24}>
                    <DashboardStats stats={stats} />
                </Col>
                
                {/* Currently Playing Section - Prominent placement */}
                <Col xs={24}>
                    <CurrentlyPlaying />
                </Col>
                
                {/* Steam Top Sellers - Prominent placement */}
                <Col xs={24}>
                    <SteamTopSellers />
                </Col>
                
                <Col xs={24} lg={16}>
                    <RecentActivity />
                </Col>
                <Col xs={24} lg={8}>
                    <Row gutter={[24, 24]}>
                        <Col xs={24}>
                            <GameCompletionChart stats={stats} />
                        </Col>
                        <Col xs={24}>
                            <RecentlyPlayed />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardOverview;
