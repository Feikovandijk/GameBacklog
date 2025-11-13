import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spin, Typography } from 'antd';
import {
  AreaChartOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { userGamesAPI } from '../services/api';
import type { UserStats } from '../services/api';
import GameCompletionChart from './GameCompletionChart';
import RecentActivity from './RecentActivity';
import RecentlyPlayed from './RecentlyPlayed';
import SteamTopSellers from './SteamTopSellers';
import CurrentlyPlaying from './CurrentlyPlaying';
import RecentlyEdited from './RecentlyEdited';

const { Title, Text } = Typography;

const iconStyle = {
  fontSize: '32px',
  color: '#ffffff',
  marginBottom: '8px',
};

const cardGradients = {
  totalGames: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  inProgress: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
  completed: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
};

const DashboardStats: React.FC<{ stats: UserStats | null }> = ({ stats }) => (
  <Row gutter={[24, 24]}>
    <Col xs={24} sm={8}>
      <Card
        style={{
          background: cardGradients.totalGames,
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
        }}
        bodyStyle={{ 
          padding: '16px', // Reduced from 24px
          color: '#ffffff',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <AreaChartOutlined style={iconStyle} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
            {stats?.totalGames || 0}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
            Total Games
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          zIndex: 1,
        }} />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card
        style={{
          background: cardGradients.inProgress,
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
        }}
        bodyStyle={{ 
          padding: '16px', // Reduced from 24px
          color: '#ffffff',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <ClockCircleOutlined style={iconStyle} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
            {stats?.currentlyPlaying || 0}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
            Games In Progress
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          zIndex: 1,
        }} />
      </Card>
    </Col>
    <Col xs={24} sm={8}>
      <Card
        style={{
          background: cardGradients.completed,
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
        }}
        bodyStyle={{ 
          padding: '16px', // Reduced from 24px
          color: '#ffffff',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <FileTextOutlined style={iconStyle} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
            {/* TODO: Add totalNotes to UserStats interface */}
            {0}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
            Notes
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          zIndex: 1,
        }} />
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
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '32px', 
      background: 'var(--primary-bg)',
      minHeight: 'calc(100vh - 80px)',
    }}>
      <div style={{ 
        marginBottom: '40px',
        textAlign: 'center',
      }}>
        <Title 
          level={1} 
          style={{ 
            marginBottom: '8px', 
            color: 'var(--text-primary)',
            fontSize: '36px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Dashboard Overview
        </Title>
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '16px',
            display: 'block',
          }}
        >
          Welcome back! Here's what's happening with your games
        </Text>
      </div>
      
      <Row gutter={[32, 32]}>
        <Col xs={24}>
          <DashboardStats stats={stats} />
        </Col>

        {/* Currently Playing and Recently Edited Section - Side by side */}
        <Col xs={24}>
          <Row gutter={[32, 0]}>
            <Col xs={24} lg={12}>
              <CurrentlyPlaying />
            </Col>
            <Col xs={24} lg={12}>
              <RecentlyEdited />
            </Col>
          </Row>
        </Col>

        {/* Steam Top Sellers - Full width with better styling */}
        <Col xs={24}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
          }}>
            <SteamTopSellers />
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
          }}>
            <RecentActivity />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <Row gutter={[0, 32]}>
            <Col xs={24}>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '24px',
              }}>
                <GameCompletionChart stats={stats} />
              </div>
            </Col>
            <Col xs={24}>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '24px',
              }}>
                <RecentlyPlayed />
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardOverview;
