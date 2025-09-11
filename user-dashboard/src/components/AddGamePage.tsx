import React, { useState } from 'react';
import { Input, Button, List, Avatar, message, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import * as api from '../services/api';
import type { Game } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;

const AddGamePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [adding, setAdding] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  const handleSearch = async (value: string) => {
    if (!value) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.gamesAPI.searchGames(value);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching games:", error);
      message.error("Failed to search for games.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: Game) => {
    setAdding(prev => ({ ...prev, [game.$id]: true }));
    try {
      await api.userGamesAPI.addGame({
        steam_appid: game.steam_appid,
        status: 'want_to_play', // Default status
      });
      message.success(`${game.name} added to your backlog!`);
      // Optional: navigate to the game list after adding
      navigate('/games');
    } catch (error) {
      console.error("Error adding game:", error);
      message.error(`Failed to add ${game.name}. It might already be in your backlog.`);
    } finally {
      setAdding(prev => ({ ...prev, [game.$id]: false }));
    }
  };

  return (
    <Card>
        <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Add Game</h1>
            <p style={{ margin: 0, color: '#888' }}>Search for games to add to your backlog.</p>
        </div>
        <Search
            placeholder="e.g. Cyberpunk 2077"
            enterButton="Search"
            size="large"
            onSearch={handleSearch}
            loading={loading}
            style={{ marginBottom: 24 }}
        />
        <List
            itemLayout="horizontal"
            dataSource={searchResults}
            loading={loading}
            renderItem={item => (
            <List.Item
                actions={[
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddGame(item)}
                    loading={adding[item.$id]}
                >
                    Add to Backlog
                </Button>
                ]}
            >
                <List.Item.Meta
                avatar={<Avatar src={item.header_image} shape="square" size={64} />}
                title={<a href={`https://store.steampowered.com/app/${item.steam_appid}`} target="_blank" rel="noopener noreferrer">{item.name}</a>}
                description={item.developers?.join(', ')}
                />
            </List.Item>
            )}
        />
    </Card>
  );
};

export default AddGamePage; 