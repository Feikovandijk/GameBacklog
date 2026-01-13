import React, { useState, useEffect } from 'react';
import {
    Table,
    Input,
    Button,
    Avatar,
    Space,
    Typography,
    message,
    Radio,
    Tooltip,
    Select,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    AppstoreOutlined,
    BarsOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import { useNavigate } from 'react-router-dom';
import EditGameModal from './EditGameModal';
import StatusBadge from './shared/StatusBadge';
import GameCard from './shared/GameCard';
import type { UserGame } from '../services/api';

const { Option } = Select;
const { Text } = Typography;

const GameLibrary: React.FC = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState<UserGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 50,
        total: 0,
    });

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [appending, setAppending] = useState(false);

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedGame, setSelectedGame] = useState<UserGame | null>(null);

    const fetchGames = async (
        page = 1,
        append = false
    ) => {
        if (append) {
            setAppending(true);
        } else {
            setLoading(true);
        }

        try {
            const pageSize = 50;
            const offset = (page - 1) * pageSize;

            const response = await api.getUserGames({
                offset,
                limit: pageSize,
                search: searchText,
                status: statusFilter,
            });

            if (append) {
                setGames(prev => [...prev, ...response.data.documents]);
            } else {
                setGames(response.data.documents);
            }

            setPagination(prev => ({
                ...prev,
                total: response.data.total,
                current: page,
                pageSize: pageSize
            }));
        } catch (error) {
            console.error('Error fetching games:', error);
            message.error('Failed to load library');
        } finally {
            setLoading(false);
            setAppending(false);
        }
    };

    useEffect(() => {
        // Reset to page 1 when filters change
        fetchGames(1, false);
    }, [searchText, statusFilter]);

    const handleLoadMore = () => {
        fetchGames(pagination.current + 1, true);
    };

    const handleEdit = (game: UserGame) => {
        setSelectedGame(game);
        setIsModalVisible(true);
    };

    const handleUpdateGame = async (values: Partial<UserGame>) => {
        if (!selectedGame) return;
        try {
            await api.userGamesAPI.updateGame(selectedGame.$id, values);
            message.success('Game updated');
            setIsModalVisible(false);
            fetchGames(); // Refresh
        } catch {
            message.error('Failed to update game');
        }
    };

    const handleDeleteGame = async () => {
        if (!selectedGame) return;
        try {
            await api.userGamesAPI.removeGame(selectedGame.$id);
            message.success('Game removed');
            setIsModalVisible(false);
            fetchGames();
        } catch {
            message.error('Failed to delete game');
        }
    };

    // Table Columns
    const columns = [
        {
            title: 'Game',
            dataIndex: ['game', 'name'],
            key: 'name',
            render: (_: string, record: UserGame) => (
                <Space>
                    <Avatar
                        shape="square"
                        size={48}
                        src={record.game?.header_image}
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: record.game?.header_image ? 'transparent' : '#2a2a35',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 600
                        }}
                    >
                        {record.game?.name?.charAt(0) || '?'}
                    </Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ color: 'rgba(255,255,255,0.9)' }}>{record.game?.name}</Text>
                        {record.game?.genres && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.game.genres.slice(0, 2).join(', ')}
                            </Text>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <StatusBadge status={status} />,
        },
        {
            title: 'Time Played',
            dataIndex: 'hours_played',
            key: 'hours_played',
            render: (hours: number) => (
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {hours ? `${hours.toFixed(1)}h` : '-'}
                </span>
            ),
        },
        {
            title: 'Added',
            dataIndex: 'added_at',
            key: 'added_at',
            render: (date: string) => (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {new Date(date).toLocaleDateString()}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: UserGame) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 className="page-title" style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
                            <span className="gradient-text">My Library</span>
                        </h1>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                            {pagination.total} games in your collection
                        </Text>
                    </div>

                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/add-game')}
                        className="action-button"
                    >
                        Add Game
                    </Button>
                </div>

                {/* Toolbar */}
                <div
                    className="glass-card"
                    style={{
                        padding: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                        borderRadius: 16
                    }}
                >
                    <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 300 }}>
                        <Input
                            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            placeholder="Search library..."
                            size="large"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{
                                maxWidth: 400,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                            allowClear
                        />

                        <Select
                            placeholder="All Statuses"
                            allowClear
                            size="large"
                            style={{ width: 180 }}
                            onChange={setStatusFilter}
                            dropdownStyle={{ background: '#1e1e2e' }}
                        >
                            <Option value="want_to_play">Backlog</Option>
                            <Option value="currently_playing">Playing</Option>
                            <Option value="completed">Completed</Option>
                            <Option value="completed_100">100% Completed</Option>
                            <Option value="on_hold">On Hold</Option>
                            <Option value="dropped">Dropped</Option>
                        </Select>
                    </div>

                    <Radio.Group
                        value={viewMode}
                        onChange={e => setViewMode(e.target.value)}
                        buttonStyle="solid"
                        size="large"
                    >
                        <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
                        <Radio.Button value="list"><BarsOutlined /></Radio.Button>
                    </Radio.Group>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {loading && games.length === 0 ? (
                    <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
                    </div>
                ) : viewMode === 'grid' ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="game-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: 24,
                            marginBottom: 32
                        }}
                    >
                        {games.map(game => (
                            <GameCard
                                key={game.$id}
                                game={game}
                                onEdit={() => handleEdit(game)}
                                onClick={() => handleEdit(game)}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Table
                            columns={columns}
                            dataSource={games}
                            rowKey="$id"
                            pagination={false}
                            className="glass-table"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Load More Button */}
            {games.length < pagination.total && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 32 }}>
                    <Button
                        size="large"
                        onClick={handleLoadMore}
                        loading={appending}
                        style={{
                            minWidth: 200,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white'
                        }}
                    >
                        Load next 50
                    </Button>
                </div>
            )}

            <EditGameModal
                game={selectedGame}
                open={isModalVisible}
                onOk={handleUpdateGame}
                onCancel={() => setIsModalVisible(false)}
                onDelete={handleDeleteGame}
            />

            <style>{`
        .ant-select-selector {
           background-color: rgba(255,255,255,0.05) !important;
           border-color: rgba(255,255,255,0.1) !important;
           color: white !important;
        }
        .glass-table .ant-table {
           background: transparent !important;
           color: white;
        }
        .glass-table .ant-table-thead > tr > th {
           background: rgba(30, 30, 50, 0.8) !important;
           color: rgba(255,255,255,0.6);
           border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .glass-table .ant-table-tbody > tr > td {
           border-bottom: 1px solid rgba(255,255,255,0.05);
           color: rgba(255,255,255,0.9);
        }
        .glass-table .ant-table-tbody > tr:hover > td {
           background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
        </div>
    );
};

export default GameLibrary;
