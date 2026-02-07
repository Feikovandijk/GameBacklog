import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Spin, Space } from 'antd';
import {
  PlayCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { userGamesAPI } from '../services/api';
import type { UserGame } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const CurrentlyPlaying: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<UserGame[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      setLoading(true);
      try {
        const response = await userGamesAPI.get({
          status: 'currently_playing',
          limit: 6,
        });
        setCurrentlyPlaying(response.data.documents);
      } catch (error) {
        console.error('Error fetching currently playing games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentlyPlaying();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleContinueResearch = (_userGame: UserGame) => {
    // Navigate to game detail page (to be implemented)
    // For now, navigate to edit or games list
    navigate('/games');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewDetails = (_userGame: UserGame) => {
    // Navigate to game detail page (to be implemented)
    navigate('/games');
  };

  const formatPlaytime = (hours: number) => {
    if (hours === 0) return 'No playtime recorded';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    return `${hours.toFixed(1)} hours`;
  };

  if (loading) {
    return (
      <Card>
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}
        >
          <Spin size='large' />
        </div>
      </Card>
    );
  }

  if (currentlyPlaying.length === 0) {
    return (
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Title
            level={4}
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PlayCircleOutlined style={{ color: '#52c41a' }} />
            Currently Analyzing
          </Title>
          <Text type='secondary'>Games you're actively researching</Text>
        </div>
        <div
          style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}
        >
          <PlayCircleOutlined
            style={{ fontSize: '48px', marginBottom: '16px' }}
          />
          <div>No games currently being analyzed</div>
          <Text type='secondary'>Start analyzing games to see them here</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: '16px' }}>
        <Title
          level={4}
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <PlayCircleOutlined style={{ color: '#52c41a' }} />
          Currently Analyzing ({currentlyPlaying.length})
        </Title>
        <Text type='secondary'>Games you're actively researching</Text>
      </div>

      <Row gutter={[16, 16]}>
        {currentlyPlaying.map(userGame => (
          <Col xs={24} sm={12} lg={8} key={userGame.id}>
            <Card
              hoverable
              cover={
                <div
                  style={{
                    position: 'relative',
                    height: '160px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    alt={userGame.game?.name}
                    src={userGame.game?.header_image}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '20px 12px 12px',
                      color: 'white',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginBottom: '4px',
                      }}
                    >
                      {userGame.game?.name}
                    </div>
                    <Space align='center'>
                      <ClockCircleOutlined />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '12px',
                        }}
                      >
                        {formatPlaytime(userGame.hours_played)}
                      </Text>
                    </Space>
                  </div>
                </div>
              }
              styles={{ body: { padding: '12px' } }}
            >
              <div style={{ marginBottom: '8px' }}>
                <Text
                  type='secondary'
                  style={{ fontSize: '12px', display: 'block' }}
                >
                  {userGame.game?.developers?.join(', ')}
                </Text>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {userGame.game?.genres?.slice(0, 2).join(', ')}
                </Text>
              </div>

              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='small'
              >
                <Button
                  type='primary'
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleContinueResearch(userGame)}
                  block
                >
                  Continue Research
                </Button>
                <Button
                  type='default'
                  icon={<EditOutlined />}
                  onClick={() => handleViewDetails(userGame)}
                  block
                  size='small'
                >
                  View Details
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {currentlyPlaying.length >= 6 && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button
            type='link'
            onClick={() => navigate('/games?status=currently_playing')}
          >
            View All Analyzing Games →
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CurrentlyPlaying;
