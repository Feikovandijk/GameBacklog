import React, { useState, useEffect } from 'react';
import { List, Avatar, Typography, Spin, Card, Row, Col } from 'antd';
import { userGamesAPI } from '../services/api';
import type { UserGame } from '../services/api';

const { Text } = Typography;

const RecentlyPlayed: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [recentlyPlayed, setRecentlyPlayed] = useState<UserGame[]>([]);

    useEffect(() => {
        const fetchRecentlyPlayed = async () => {
            try {
                setLoading(true);
                const response = await userGamesAPI.getRecentlyPlayed();
                setRecentlyPlayed(response.data);
            } catch (error) {
                console.error("Failed to fetch recently played games", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentlyPlayed();
    }, []);

    const formatPlaytime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <Card title="Recent Playtime (Last 2 Weeks)">
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={recentlyPlayed}
                    renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar shape="square" src={item.game?.header_image} />}
                                title={<a href={`https://steamcommunity.com/app/${item.steam_appid}`} target="_blank" rel="noopener noreferrer">{item.game?.name}</a>}
                                description={`${formatPlaytime(item.playtime_2weeks || 0)} played`}
                            />
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );
};

export default RecentlyPlayed; 