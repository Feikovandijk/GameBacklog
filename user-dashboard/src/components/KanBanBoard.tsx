import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import * as api from '../services/api';
import GameCard from './shared/GameCard';
import StatusBadge, { type GameStatus } from './shared/StatusBadge';
import EditGameModal from './EditGameModal';
import AddToBoardModal from './AddToBoardModal';
import type { UserGame } from '../services/api';

// Configuration for columns
const COLUMNS: { id: GameStatus; title: string }[] = [
    { id: 'want_to_play', title: 'Backlog' },
    { id: 'currently_playing', title: 'In Progress' },
    { id: 'on_hold', title: 'On Hold' },
    { id: 'completed', title: 'Completed' },
    { id: 'dropped', title: 'Dropped' },
];

const KanBanBoard: React.FC = () => {
    const [games, setGames] = useState<UserGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeGame, setActiveGame] = useState<UserGame | null>(null);

    // Modals
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGame, setEditingGame] = useState<UserGame | null>(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [clearingColumn, setClearingColumn] = useState<GameStatus | null>(
        null
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchGames = async () => {
        setLoading(true);
        try {
            // Fetch all games for board
            const response = await api.getUserGames({ limit: 500 });
            setGames(response.data.documents);
        } catch (error) {
            console.error('Error fetching board:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    // Drag Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const game = games.find(g => g.id === active.id);
        setActiveGame(game || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGame(null);

        if (!over) return;

        const activeGameId = active.id as string;
        const newStatus = over.id as GameStatus;

        // Find game
        const game = games.find(g => g.id === activeGameId);
        if (!game || game.status === newStatus) return;

        // Optimistic update
        const originalGames = [...games];
        setGames(
            games.map(g =>
                g.id === activeGameId ? { ...g, status: newStatus } : g
            )
        );

        // API Call
        try {
            await api.userGamesAPI.updateGame(activeGameId, { status: newStatus });
        } catch (error) {
            console.error('Update failed:', error);
            setGames(originalGames); // Revert
        }
    };

    const handleEdit = (game: UserGame) => {
        setEditingGame(game);
        setIsModalVisible(true);
    };

    const handleUpdateGame = async (values: Partial<UserGame>) => {
        if (!editingGame) return;
        try {
            await api.userGamesAPI.updateGame(editingGame.id, values);
            setIsModalVisible(false);
            fetchGames();
        } catch {
            console.error('Failed to save');
        }
    };

    const handleDeleteGame = async () => {
        if (!editingGame) return;
        try {
            await api.userGamesAPI.removeGame(editingGame.id);
            setGames(games.filter(g => g.id !== editingGame.id));
            setIsModalVisible(false);
        } catch {
            console.error('Failed to remove');
        }
    };

    const handleClearColumn = async (status: GameStatus) => {
        const originalGames = [...games];
        setGames(games.filter(g => g.status !== status));
        setClearingColumn(null);
        try {
            await api.userGamesAPI.bulkUpdateStatus(status, null);
        } catch (error) {
            console.error('Clear column failed:', error);
            setGames(originalGames);
        }
    };

    // Sub-component for Droppable Column
    const BoardColumn = ({
        id,
        title,
        children,
        onClear,
    }: {
        id: string;
        title: string;
        children: React.ReactNode;
        onClear: () => void;
    }) => {
        const { setNodeRef, isOver } = useDroppable({ id });
        const count = React.Children.count(children);

        return (
            <div
                ref={setNodeRef}
                className={`w-[272px] flex-shrink-0 flex flex-col h-full rounded-xl transition-colors duration-200 ${isOver ? 'bg-white/8 ring-1 ring-primary/30' : 'bg-white/[0.03]'
                    }`}
            >
                <div className='flex items-center justify-between px-3 py-3 flex-shrink-0'>
                    <div className='flex items-center gap-2'>
                        <StatusBadge status={id} minimal className='w-2.5 h-2.5' />
                        <span className='font-semibold text-white text-sm'>{title}</span>
                        <span className='bg-white/10 rounded-full px-2 py-0.5 text-[11px] text-text-secondary font-medium min-w-[20px] text-center'>
                            {count}
                        </span>
                    </div>
                    {count > 0 && (
                        <button
                            onClick={onClear}
                            className='text-text-secondary/50 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5'
                            title={`Clear ${title}`}
                        >
                            <span className='material-symbols-outlined text-[18px]'>
                                delete_sweep
                            </span>
                        </button>
                    )}
                </div>

                <div className='flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2 min-h-[100px] kanban-scroll'>
                    {children}
                    {count === 0 && (
                        <div className='flex-1 flex items-center justify-center text-text-secondary/50 text-xs py-8'>
                            Drop games here
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Draggable card wrapper
    const DraggableCard = ({ game }: { game: UserGame }) => {
        const { attributes, listeners, setNodeRef, transform, isDragging } =
            useDraggable({
                id: game.id,
                data: { game },
            });

        const style = transform
            ? {
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
                opacity: isDragging ? 0 : 1,
            }
            : undefined;

        return (
            <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
                <GameCard game={game} onEdit={() => handleEdit(game)} showProgress />
            </div>
        );
    };

    if (loading) {
        return (
            <div className='h-full flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
            </div>
        );
    }

    return (
        <div className='-m-6 md:-m-8 lg:-mx-10 lg:-my-8 flex flex-col h-[calc(100vh-57px)]'>
            {/* Header */}
            <div className='px-6 pt-4 pb-3 flex items-center justify-between flex-shrink-0'>
                <h1 className='text-2xl font-bold text-white'>Board</h1>
                <button
                    onClick={() => setIsAddModalVisible(true)}
                    className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-sm'
                >
                    <span className='material-symbols-outlined text-[18px]'>add</span>
                    Add Game
                </button>
            </div>

            {/* Board Area */}
            <div className='flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4 kanban-scroll'>
                <div className='flex gap-3 h-full min-w-max'>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {COLUMNS.map(col => (
                            <BoardColumn
                                key={col.id}
                                id={col.id}
                                title={col.title}
                                onClear={() => setClearingColumn(col.id)}
                            >
                                {games
                                    .filter(g => g.status === col.id)
                                    .map(game => (
                                        <DraggableCard key={game.id} game={game} />
                                    ))}
                            </BoardColumn>
                        ))}

                        <DragOverlay>
                            {activeGame ? (
                                <div
                                    className='transform rotate-2 cursor-grabbing shadow-2xl'
                                    style={{ width: '272px' }}
                                >
                                    <GameCard
                                        game={activeGame}
                                        className='shadow-accent-purple/50'
                                        showProgress
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            <EditGameModal
                game={editingGame}
                open={isModalVisible}
                onOk={handleUpdateGame}
                onCancel={() => setIsModalVisible(false)}
                onDelete={handleDeleteGame}
            />

            <AddToBoardModal
                open={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onGameAdded={fetchGames}
            />

            {/* Clear Column Confirmation */}
            {clearingColumn && (
                <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
                    <div className='bg-surface-dark border border-border-dark rounded-2xl w-full max-w-sm p-6 shadow-2xl'>
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='p-2 bg-red-500/10 rounded-xl'>
                                <span className='material-symbols-outlined text-red-400 text-[24px]'>
                                    warning
                                </span>
                            </div>
                            <h3 className='text-lg font-bold text-white'>
                                Clear{' '}
                                {
                                    COLUMNS.find(c => c.id === clearingColumn)
                                        ?.title
                                }
                            </h3>
                        </div>
                        <p className='text-text-secondary text-sm mb-6'>
                            This will remove{' '}
                            <span className='text-white font-semibold'>
                                {
                                    games.filter(
                                        g => g.status === clearingColumn
                                    ).length
                                }{' '}
                                games
                            </span>{' '}
                            from this column on your board. They will remain in your library.
                        </p>
                        <div className='flex gap-3 justify-end'>
                            <button
                                onClick={() => setClearingColumn(null)}
                                className='px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors text-sm'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    handleClearColumn(clearingColumn)
                                }
                                className='px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm'
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanBanBoard;
