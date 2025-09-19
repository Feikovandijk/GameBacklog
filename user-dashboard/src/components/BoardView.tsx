import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Button, Spin } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import GameCard from './GameCard';
import * as api from '../services/api';
import type { UserGame } from '../services/api';
import EditGameModal from './EditGameModal';

const { Title } = Typography;

const statusColumns = [
  { id: 'backlog', title: 'Backlog', keys: ['want_to_play'] },
  { id: 'in_progress', title: 'In Progress', keys: ['currently_playing'] },
  { id: 'on_hold', title: 'On Hold', keys: ['on_hold'] },
  { id: 'completed', title: 'Completed', keys: ['completed', 'completed_100'] },
  { id: 'dropped', title: 'Dropped', keys: ['dropped'] },
];

const DraggableGameCard = ({
  game,
  onTitleClick,
}: {
  game: UserGame;
  onTitleClick: (game: UserGame) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: game.$id,
    data: { game },
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100, // Make sure dragged card is on top
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <GameCard game={game} onTitleClick={onTitleClick} />
    </div>
  );
};

const DroppableColumn = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <Col xs={24} sm={12} xl={4}>
      <div ref={setNodeRef} className='bg-neutral-200 p-4 rounded-lg h-full'>
        <Row
          justify='space-between'
          align='middle'
          style={{ marginBottom: '16px' }}
        >
          <Title
            level={5}
            style={{ margin: 0, textTransform: 'uppercase', color: '#6B778C' }}
          >
            {title}
          </Title>
          <Button type='text' icon={<MoreOutlined />} />
        </Row>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: '60vh',
          }}
        >
          {children}
        </div>
      </div>
    </Col>
  );
};

const BoardView: React.FC = () => {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<UserGame | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchAllGames = async () => {
      setLoading(true);
      try {
        const response = await api.getUserGames({ limit: 500 });
        setGames(response.data.documents);
      } catch (error) {
        console.error('Error fetching games for board:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllGames();
  }, []);

  const handleTitleClick = (game: UserGame) => {
    setEditingGame(game);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setEditingGame(null);
  };

  const handleGameUpdate = async (values: Partial<UserGame>) => {
    if (!editingGame) return;

    try {
      const updatedGame = await api.updateUserGame(editingGame.$id, values);
      setGames(prevGames =>
        prevGames.map(g =>
          g.$id === editingGame.$id ? { ...g, ...updatedGame.data } : g
        )
      );
      handleModalClose();
    } catch (error) {
      console.error('Failed to update game:', error);
    }
  };

  const handleGameDelete = async () => {
    if (!editingGame) return;

    try {
      await api.removeUserGame(editingGame.$id);
      setGames(prevGames => prevGames.filter(g => g.$id !== editingGame.$id));
      handleModalClose();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const gameId = active.id as string;
      const newColumnId = over.id as string;

      const newStatusCol = statusColumns.find(col => col.id === newColumnId);
      if (!newStatusCol) return;

      const newStatus = newStatusCol.keys[0] as UserGame['status'];
      const originalGames = [...games];
      const updatedGames = games.map(g =>
        g.$id === gameId ? { ...g, status: newStatus } : g
      );
      setGames(updatedGames);

      try {
        await api.updateUserGame(gameId, { status: newStatus });
      } catch (error) {
        console.error('Error updating game status:', error);
        setGames(originalGames); // Revert on error
      }
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div>
        <Row
          justify='space-between'
          align='middle'
          style={{ marginBottom: '24px' }}
        >
          <Title level={2} style={{ margin: 0 }}>
            Kanban Board
          </Title>
          <div>{/* Add filter/sort controls here later */}</div>
        </Row>
        <Row gutter={16}>
          {statusColumns.map(col => (
            <DroppableColumn key={col.id} id={col.id} title={col.title}>
              {games
                .filter(g => col.keys.includes(g.status))
                .map(game => (
                  <DraggableGameCard
                    key={game.$id}
                    game={game}
                    onTitleClick={handleTitleClick}
                  />
                ))}
            </DroppableColumn>
          ))}
        </Row>
      </div>
      <EditGameModal
        game={editingGame}
        open={isEditModalOpen}
        onOk={handleGameUpdate}
        onCancel={handleModalClose}
        onDelete={handleGameDelete}
      />
    </DndContext>
  );
};

export default BoardView;
