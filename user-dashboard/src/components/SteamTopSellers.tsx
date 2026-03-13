import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Spin, message } from 'antd';
import { PlusOutlined, FireOutlined } from '@ant-design/icons';
import { userGamesAPI } from '../services/api';

const { Title, Text } = Typography;

interface TopSellerGame {
  steam_appid: number;
  name: string;
  header_image: string;
  price_final: number;
  price_currency: string;
  developers: string[];
  genres: string[];
  rank: number;
}

const SteamTopSellers: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [topSellers, setTopSellers] = useState<TopSellerGame[]>([]);
  const [adding, setAdding] = useState<{ [key: number]: boolean }>({});

  // Mock data for now - will be replaced with actual API call
  useEffect(() => {
    const fetchTopSellers = () => {
      setLoading(true);
      // TODO: Replace with actual API call to /api/steam/top-sellers
      // For now, using mock data
      const mockData: TopSellerGame[] = [
        {
          steam_appid: 1245620,
          name: 'ELDEN RING',
          header_image:
            'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
          price_final: 5999,
          price_currency: 'USD',
          developers: ['FromSoftware Inc.'],
          genres: ['Action', 'RPG'],
          rank: 1,
        },
        {
          steam_appid: 1086940,
          name: "Baldur's Gate 3",
          header_image:
            'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
          price_final: 5999,
          price_currency: 'USD',
          developers: ['Larian Studios'],
          genres: ['RPG', 'Strategy'],
          rank: 2,
        },
        {
          steam_appid: 1172470,
          name: 'Apex Legends',
          header_image:
            'https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg',
          price_final: 0,
          price_currency: 'USD',
          developers: ['Respawn Entertainment'],
          genres: ['Action', 'Free to Play'],
          rank: 3,
        },
        {
          steam_appid: 570,
          name: 'Dota 2',
          header_image:
            'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
          price_final: 0,
          price_currency: 'USD',
          developers: ['Valve'],
          genres: ['Strategy', 'Free to Play'],
          rank: 4,
        },
        {
          steam_appid: 730,
          name: 'Counter-Strike 2',
          header_image:
            'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
          price_final: 0,
          price_currency: 'USD',
          developers: ['Valve'],
          genres: ['Action', 'Free to Play'],
          rank: 5,
        },
      ];

      // Simulate API delay
      setTimeout(() => {
        setTopSellers(mockData);
        setLoading(false);
      }, 1000);
    };

    fetchTopSellers();
  }, []);

  const handleAddToBacklog = async (game: TopSellerGame) => {
    setAdding(prev => ({ ...prev, [game.steam_appid]: true }));

    try {
      await userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: 'want_to_play',
        priority: 1,
      });
      message.success(`${game.name} added to your backlog!`);
    } catch (error) {
      console.error('Error adding game:', error);
      message.error(
        `Failed to add ${game.name}. It might already be in your backlog.`
      );
    } finally {
      setAdding(prev => ({ ...prev, [game.steam_appid]: false }));
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${(price / 100).toFixed(2)}`;
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
          <FireOutlined style={{ color: '#ff4d4f' }} />
          Steam Weekly Top Sellers
        </Title>
        <Text type='secondary'>
          Trending games this week - perfect for market research
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {topSellers.map(game => (
          <Col xs={24} sm={12} lg={8} xl={4.8} key={game.steam_appid}>
            <Card
              size='small'
              hoverable
              cover={
                <div style={{ position: 'relative' }}>
                  <img
                    alt={game.name}
                    src={game.header_image}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: '#ff4d4f',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    #{game.rank}
                  </div>
                </div>
              }
              actions={[
                <Button
                  key='add'
                  type='primary'
                  size='small'
                  icon={<PlusOutlined />}
                  loading={adding[game.steam_appid]}
                  onClick={() => handleAddToBacklog(game)}
                  block
                >
                  Add to Backlog
                </Button>,
              ]}
            >
              <Card.Meta
                title={
                  <div style={{ fontSize: '14px', lineHeight: '1.2' }}>
                    {game.name}
                  </div>
                }
                description={
                  <div>
                    <Text
                      type='secondary'
                      style={{ fontSize: '12px', display: 'block' }}
                    >
                      {game.developers[0]}
                    </Text>
                    <Text
                      type='secondary'
                      style={{ fontSize: '12px', display: 'block' }}
                    >
                      {game.genres.slice(0, 2).join(', ')}
                    </Text>
                    <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                      {formatPrice(game.price_final)}
                    </Text>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default SteamTopSellers;
