import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import type { UserGame } from '../services/api';
import EditGameModal from './EditGameModal';
import StatusBadge from './shared/StatusBadge';
import GameCard from './shared/GameCard';

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
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [appending, setAppending] = useState(false);

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedGame, setSelectedGame] = useState<UserGame | null>(null);

    const fetchGames = async (page = 1, append = false) => {
        if (append) {
            setAppending(true);
        } else {
            setLoading(true);
        }

        try {
            const pageSize = pagination.pageSize;
            const offset = (page - 1) * pageSize;

            const response = await api.getUserGames({
                offset,
                limit: pageSize,
                search: searchText,
                status: statusFilter || undefined,
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
                pageSize: pageSize,
            }));
        } catch (error) {
            console.error('Error fetching games:', error);
            // alert('Failed to load library'); // Basic error handling
        } finally {
            setLoading(false);
            setAppending(false);
        }
    };

    useEffect(() => {
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
            setIsModalVisible(false);
            fetchGames(pagination.current, false);
        } catch {
            console.error('Failed to update game');
        }
    };

    const handleDeleteGame = async () => {
        if (!selectedGame) return;
        try {
            await api.userGamesAPI.removeGame(selectedGame.$id);
            setIsModalVisible(false);
            fetchGames(1, false);
        } catch {
            console.error('Failed to delete game');
        }
    };

    return (
        <div className='flex flex-col h-full'>
            {/* Header */}
            <div className='mb-8'>
                <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6'>
                    <div>
                        <h1 className='text-white text-3xl font-bold mb-1'>My Library</h1>
                        <p className='text-text-secondary text-base'>
                            {pagination.total} games in your collection
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/add-game')}
                        className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold shadow-lg shadow-primary/20 transition-all'
                    >
                        <span className='material-symbols-outlined font-bold'>add</span>
                        Add Game
                    </button>
                </div>

                {/* Toolbar */}
                <div className='bg-surface-dark border border-border-dark rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between'>
                    <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1'>
                        {/* Search */}
                        <div className='relative flex-1 max-w-md'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                                    search
                                </span>
                            </div>
                            <input
                                type='text'
                                className='block w-full pl-10 pr-3 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm'
                                placeholder='Search library...'
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                        </div>

                        {/* Filter */}
                        <div className='relative w-full md:w-48'>
                            <select
                                className='block w-full pl-3 pr-10 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm'
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value=''>All Statuses</option>
                                <option value='want_to_play'>Backlog</option>
                                <option value='currently_playing'>Playing</option>
                                <option value='completed'>Completed</option>
                                <option value='completed_100'>100% Completed</option>
                                <option value='on_hold'>On Hold</option>
                                <option value='dropped'>Dropped</option>
                            </select>
                            <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                                <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                                    expand_more
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className='flex bg-background-dark rounded-xl p-1 border border-border-dark'>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                    ? 'bg-primary text-background-dark'
                                    : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            <span className='material-symbols-outlined text-[20px] block'>
                                grid_view
                            </span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                    ? 'bg-primary text-background-dark'
                                    : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            <span className='material-symbols-outlined text-[20px] block'>
                                view_list
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className='flex-1 relative min-h-[400px]'>
                <AnimatePresence mode='wait'>
                    {loading && games.length === 0 ? (
                        <div className='absolute inset-0 flex items-center justify-center'>
                            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <motion.div
                            key='grid'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8'
                        >
                            {games.map(game => (
                                <div
                                    key={game.$id}
                                    onClick={() => handleEdit(game)}
                                    className='cursor-pointer'
                                >
                                    <GameCard game={game} />
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key='list'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className='overflow-x-auto bg-surface-dark border border-border-dark rounded-2xl'
                        >
                            <table className='w-full text-left border-collapse'>
                                <thead>
                                    <tr className='border-b border-border-dark text-xs text-text-secondary uppercase tracking-wider bg-background-dark/50'>
                                        <th className='px-6 py-4 font-semibold'>Game</th>
                                        <th className='px-6 py-4 font-semibold'>Status</th>
                                        <th className='px-6 py-4 font-semibold'>Time Played</th>
                                        <th className='px-6 py-4 font-semibold'>Added</th>
                                        <th className='px-6 py-4 font-semibold text-right'>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-border-dark/50 text-sm'>
                                    {games.map(game => (
                                        <tr
                                            key={game.$id}
                                            className='hover:bg-surface-hover/50 transition-colors group cursor-pointer'
                                            onClick={() => handleEdit(game)}
                                        >
                                            <td className='px-6 py-4'>
                                                <div className='flex items-center gap-4'>
                                                    <img
                                                        src={game.game?.header_image}
                                                        alt={game.game?.name}
                                                        className='w-12 h-12 object-cover rounded-lg border border-border-dark'
                                                    />
                                                    <div>
                                                        <div className='font-bold text-white group-hover:text-primary transition-colors'>
                                                            {game.game?.name}
                                                        </div>
                                                        <div className='text-xs text-text-secondary'>
                                                            {game.game?.genres?.slice(0, 2).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='px-6 py-4'>
                                                <StatusBadge status={game.status} />
                                            </td>
                                            <td className='px-6 py-4 text-text-secondary'>
                                                {game.hours_played ? `${game.hours_played.toFixed(1)}h` : '-'}
                                            </td>
                                            <td className='px-6 py-4 text-text-secondary'>
                                                {new Date(game.added_at).toLocaleDateString()}
                                            </td>
                                            <td className='px-6 py-4 text-right'>
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleEdit(game);
                                                    }}
                                                    className='p-2 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-white transition-colors'
                                                >
                                                    <span className='material-symbols-outlined text-[20px]'>
                                                        edit
                                                    </span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Load More */}
                {games.length < pagination.total && (
                    <div className='flex justify-center mt-8 pb-12'>
                        <button
                            onClick={handleLoadMore}
                            disabled={appending}
                            className='px-6 py-3 rounded-xl border border-border-dark bg-surface-dark hover:bg-surface-hover text-white font-medium transition-colors disabled:opacity-50'
                        >
                            {appending ? 'Loading...' : `Load next ${pagination.pageSize}`}
                        </button>
                    </div>
                )}
            </div>

            <EditGameModal
                game={selectedGame}
                open={isModalVisible}
                onOk={handleUpdateGame}
                onCancel={() => setIsModalVisible(false)}
                onDelete={handleDeleteGame}
            />
        </div>
    );
};

export default GameLibrary;
