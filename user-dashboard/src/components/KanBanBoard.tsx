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
    { id: 'want_to_play', title: 'To Play' },
    { id: 'currently_playing', title: 'Playing' },
    { id: 'analysis_needed', title: 'Analysis Needed' },
    { id: 'completed', title: 'Completed' },
];

const KanBanBoard: React.FC = () => {
    const [games, setGames] = useState<UserGame[]>([]);
    const [filteredGames, setFilteredGames] = useState<UserGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeGame, setActiveGame] = useState<UserGame | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

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
            const allGames = response.data.documents;
            setGames(allGames);
            setFilteredGames(allGames);

            // Extract unique genres/tags for filter
            const tags = new Set<string>();
            allGames.forEach(g => {
                g.game?.genres?.forEach(genre => tags.add(genre));
            });
            setAvailableTags(Array.from(tags).sort().slice(0, 8)); // Top 8 alphabetical for now
        } catch (error) {
            console.error('Error fetching board:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    useEffect(() => {
        if (!selectedTag) {
            setFilteredGames(games);
        } else {
            setFilteredGames(games.filter(g => g.game?.genres?.includes(selectedTag)));
        }
    }, [selectedTag, games]);

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
        const updatedGames = games.map(g =>
            g.id === activeGameId ? { ...g, status: newStatus } : g
        );
        setGames(updatedGames);

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
                        <h2 className='font-bold text-white text-lg'>{title}</h2>
                        <span className='bg-primary/10 rounded-full px-2.5 py-0.5 text-xs text-primary font-bold'>
                            {React.Children.count(children)}
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
            <div className='px-8 pt-6 pb-2 flex items-center justify-between'>
                <h1 className='text-3xl font-bold text-white'>Active Analysis</h1>
                <div className='flex items-center gap-2'>
                    {/* <button className='bg-primary text-background-dark font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors'>
                        <span className='material-symbols-outlined'>sync</span>
                        Sync Steam
                    </button> */}
                    <button
                        onClick={() => setIsAddModalVisible(true)}
                        className='px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-sm'
                    >
                        <span className='material-symbols-outlined text-[18px]'>add</span>
                        Add Game
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className='px-8 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar'>
                <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${!selectedTag
                        ? 'bg-primary text-background-dark'
                        : 'bg-surface-light text-text-secondary hover:text-white hover:bg-surface-hover'
                        }`}
                >
                    All Games
                </button>
                {availableTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedTag === tag
                            ? 'bg-primary text-background-dark'
                            : 'bg-surface-light text-text-secondary hover:text-white hover:bg-surface-hover'
                            }`}
                    >
                        {tag}
                    </button>
                ))}
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
                        <BoardColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            onClear={() => setClearingColumn(col.id)}
                        >
                            {filteredGames
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

            {/* Clear Column Confirmation */ }
    {
        clearingColumn && (
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
        )
    }
        </div >
    );
};

export default KanBanBoard;
