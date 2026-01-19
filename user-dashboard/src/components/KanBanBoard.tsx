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

    // Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGame, setEditingGame] = useState<UserGame | null>(null);

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
        const game = games.find(g => g.$id === active.id);
        setActiveGame(game || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGame(null);

        if (!over) return;

        const activeGameId = active.id as string;
        const newStatus = over.id as GameStatus;

        // Find game
        const game = games.find(g => g.$id === activeGameId);
        if (!game || game.status === newStatus) return;

        // Optimistic update
        const originalGames = [...games];
        setGames(
            games.map(g =>
                g.$id === activeGameId ? { ...g, status: newStatus } : g
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
            await api.userGamesAPI.updateGame(editingGame.$id, values);
            setIsModalVisible(false);
            fetchGames();
        } catch {
            console.error('Failed to save');
        }
    };

    const handleDeleteGame = async () => {
        if (!editingGame) return;
        try {
            await api.userGamesAPI.removeGame(editingGame.$id);
            setGames(games.filter(g => g.$id !== editingGame.$id));
            setIsModalVisible(false);
        } catch {
            console.error('Failed to remove');
        }
    };

    // Sub-component for Droppable Column
    const BoardColumn = ({
        id,
        title,
        children,
    }: {
        id: string;
        title: string;
        children: React.ReactNode;
    }) => {
        const { setNodeRef, isOver } = useDroppable({ id });

        return (
            <div
                ref={setNodeRef}
                className={`flex-shrink-0 w-80 flex flex-col h-full rounded-2xl p-2 transition-colors duration-200 ${isOver ? 'bg-white/5' : 'bg-transparent'
                    }`}
            >
                <div className='flex items-center justify-between p-4 sticky top-0 z-10'>
                    <div className='flex items-center gap-2'>
                        <StatusBadge status={id} minimal className='w-2.5 h-2.5' />
                        <span className='font-bold text-white text-lg'>{title}</span>
                        <span className='bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-text-secondary font-medium'>
                            {React.Children.count(children)}
                        </span>
                    </div>
                    {/* <button className='text-text-secondary hover:text-white transition-colors'>
            <span className='material-symbols-outlined text-[20px]'>
              more_horiz
            </span>
          </button> */}
                </div>

                <div className='flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-4'>
                    {children}
                </div>
            </div>
        );
    };

    // Draggable card wrapper
    const DraggableCard = ({ game }: { game: UserGame }) => {
        const { attributes, listeners, setNodeRef, transform, isDragging } =
            useDraggable({
                id: game.$id,
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
        <div className='h-[calc(100vh-64px)] flex flex-col'>
            {/* Header */}
            <div className='px-8 pt-6 pb-2'>
                <h1 className='text-3xl font-bold text-white'>Project Board</h1>
            </div>

            {/* Board Area */}
            <div className='flex-1 overflow-x-auto overflow-y-hidden p-8 flex gap-4'>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {COLUMNS.map(col => (
                        <BoardColumn key={col.id} id={col.id} title={col.title}>
                            {games
                                .filter(g => g.status === col.id)
                                .map(game => (
                                    <DraggableCard key={game.$id} game={game} />
                                ))}
                        </BoardColumn>
                    ))}

                    <DragOverlay>
                        {activeGame ? (
                            <div
                                className='transform rotate-2 cursor-grabbing shadow-2xl'
                                style={{ width: '100%', maxWidth: '300px' }}
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

            <EditGameModal
                game={editingGame}
                open={isModalVisible}
                onOk={handleUpdateGame}
                onCancel={() => setIsModalVisible(false)}
                onDelete={handleDeleteGame}
            />
        </div>
    );
};

export default KanBanBoard;
