import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, Avatar, Space, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, CheckCircleOutlined, MessageOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import * as api from '../services/api';
import { useNavigate } from 'react-router-dom';
import EditGameModal from './EditGameModal';

const { Search } = Input;

// Define the type for a single game in the backlog
// Using the UserGame from api.ts to avoid redefining
type UserGame = api.UserGame;

const statusColors: { [key: string]: string } = {
  'Completed': 'blue',
  'In Progress': 'green',
  'To Play': 'purple',
  'On Hold': 'red',
};

const GameListPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null);

  const fetchGames = async (page = 1, pageSize = 10, search = '', filters = {}) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await api.getUserGames({ offset, limit: pageSize, search, ...filters });
      setGames(response.data.documents);
      setPagination(prev => ({ ...prev, total: response.data.total, current: page }));
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleTableChange = (pagination: any) => {
    fetchGames(pagination.current, pagination.pageSize);
  };

  const handleEdit = (record: UserGame) => {
    setSelectedGame(record);
    setIsModalVisible(true);
  };

  const handleUpdateGame = async (values: { status: UserGame['status'], user_notes: string }) => {
    if (!selectedGame) return;
    try {
      await api.userGamesAPI.updateGame(selectedGame.$id, values);
      message.success('Game updated successfully!');
      setIsModalVisible(false);
      fetchGames(pagination.current, pagination.pageSize); // Refresh data
    } catch (error) {
      message.error('Failed to update game.');
      console.error("Error updating game:", error);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: ['game', 'name'],
      key: 'title',
      render: (text: string, record: UserGame) => (
        <Space>
          <Avatar shape="square" size="large" src={record.game?.header_image} />
          <span>{record.game?.name}</span>
        </Space>
      ),
    },
    {
      title: 'Genre',
      dataIndex: ['game', 'genres'],
      key: 'genre',
      render: (genres: string[]) => <>{genres?.join(', ')}</>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Typography.Text type="secondary" style={{ textTransform: 'capitalize' }}>
            {status.replace(/_/g, ' ')}
        </Typography.Text>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'user_notes',
      key: 'notes',
    },
    {
        title: 'Last Played',
        dataIndex: 'last_played',
        key: 'lastPlayed',
        render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: UserGame) => (
        <Space size="middle">
          <a onClick={() => handleEdit(record)}><EditOutlined /></a>
          <a><CheckCircleOutlined /></a>
          <a><MessageOutlined /></a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0, fontWeight: 600 }}>Game List</h1>
          <Typography.Text type="secondary">Manage your complete game backlog.</Typography.Text>
        </div>
        <Button size="large" type="primary" icon={<PlusOutlined />} onClick={() => navigate('/add-game')}>Add New Game</Button>
      </div>
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' 
      }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
          <Search
            placeholder="Search by title, genre, or status..."
            onSearch={(value) => fetchGames(1, pagination.pageSize, value)}
            style={{ width: 300 }}
            size="large"
          />
          <Button size="large" icon={<FilterOutlined />}>Filter</Button>
        </div>
        <Table
          columns={columns}
          dataSource={games}
          rowKey="$id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          style={{ background: 'transparent' }}
        />
      </div>
      <EditGameModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleUpdateGame}
        game={selectedGame}
      />
    </div>
  );
};

export default GameListPage; 