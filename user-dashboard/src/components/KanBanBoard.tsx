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
import { Typography, Button, message, Spin } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import * as api from '../services/api';
import GameCard from './shared/GameCard';
import StatusBadge, { type GameStatus } from './shared/StatusBadge';
import EditGameModal from './EditGameModal';
import type { UserGame } from '../services/api';

const { Text } = Typography;

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
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
        setGames(games.map(g =>
            g.$id === activeGameId ? { ...g, status: newStatus } : g
        ));

        // API Call
        try {
            await api.userGamesAPI.updateGame(activeGameId, { status: newStatus });
            message.success(`Moved to ${newStatus.replace('_', ' ')}`);
        } catch (error) {
            console.error('Update failed:', error);
            message.error('Failed to move card');
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
            message.error('Failed to save');
        }
    };

    const handleDeleteGame = async () => {
        if (!editingGame) return;
        try {
            await api.userGamesAPI.removeGame(editingGame.$id);
            setGames(games.filter(g => g.$id !== editingGame.$id));
            setIsModalVisible(false);
            message.success('Game removed');
        } catch {
            message.error('Failed to remove');
        }
    };

    // Sub-component for Droppable Column
    const BoardColumn = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => {
        const { setNodeRef, isOver } = useDroppable({ id });

        return (
            <div
                ref={setNodeRef}
                style={{
                    flex: '0 0 320px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    background: isOver ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                    borderRadius: 16,
                    padding: 8
                }}
            >
                <div style={{
                    padding: '16px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={id} minimal style={{ width: 10, height: 10 }} />
                        <Text strong style={{ color: 'white', fontSize: 16 }}>{title}</Text>
                        <span style={{
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '2px 8px',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)'
                        }}>
                            {React.Children.count(children)}
                        </span>
                    </div>
                    <Button type="text" icon={<MoreOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />} />
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    {children}
                </div>
            </div>
        );
    };

    // Draggable card wrapper
    const DraggableCard = ({ game }: { game: UserGame }) => {
        const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
            id: game.$id,
            data: { game }
        });

        const style = transform ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            opacity: isDragging ? 0 : 1
        } : undefined;

        return (
            <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
                <GameCard game={game} onEdit={() => handleEdit(game)} showProgress />
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={{ height: 'calc(100vh - 64px)', padding: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '24px 32px 0' }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                    <span className="gradient-text">Project Board</span>
                </h1>
            </div>

            {/* Board Area - Horizontal Scroll */}
            <div style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '24px 32px',
                display: 'flex',
                gap: 16
            }}>
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
                                ))
                            }
                        </BoardColumn>
                    ))}

                    <DragOverlay>
                        {activeGame ? (
                            <div style={{ transform: 'rotate(2deg)', cursor: 'grabbing' }}>
                                <GameCard game={activeGame} className="dragging-card" showProgress />
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
