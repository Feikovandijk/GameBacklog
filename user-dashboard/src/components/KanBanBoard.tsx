import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
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
import { type GameStatus } from './shared/StatusBadge';
import EditGameModal from './EditGameModal';
import AddToBoardModal from './AddToBoardModal';
import BoardStatsBar from './kanban/BoardStatsBar';
import BoardToolbar from './kanban/BoardToolbar';
import BoardColumn from './kanban/BoardColumn';
import type { UserGame } from '../services/api';

// Column configuration
const PRIMARY_COLUMNS: { id: GameStatus; title: string }[] = [
  { id: 'want_to_play', title: 'Backlog' },
  { id: 'currently_playing', title: 'Playing' },
  { id: 'analysis_needed', title: 'Analysis' },
  { id: 'completed', title: 'Completed' },
];

const SECONDARY_COLUMNS: { id: GameStatus; title: string }[] = [
  { id: 'completed_100', title: '100%' },
  { id: 'on_hold', title: 'On Hold' },
  { id: 'dropped', title: 'Dropped' },
];

const ALL_COLUMNS = [...PRIMARY_COLUMNS, ...SECONDARY_COLUMNS];

// Draggable card wrapper
const DraggableCard = ({
  game,
  onEdit,
}: {
  game: UserGame;
  onEdit: () => void;
}) => {
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
      <GameCard
        game={game}
        onEdit={onEdit}
        showProgress
        showAnalysisIndicators
      />
    </div>
  );
};

const KanBanBoard: React.FC = () => {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<UserGame | null>(null);

  // Filters & sorting
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  // Column visibility
  const [visibleSecondary, setVisibleSecondary] = useState<Set<GameStatus>>(
    new Set()
  );

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
      const response = await api.getUserGames({ limit: 500 });
      const allGames = response.data.documents;
      setGames(allGames);

      // Extract unique genres for filter
      const tags = new Set<string>();
      allGames.forEach(g => {
        g.game?.genres?.forEach(genre => tags.add(genre));
      });
      setAvailableTags(Array.from(tags).sort().slice(0, 12));
    } catch (error) {
      console.error('Error fetching board:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Filtered + sorted games
  const filteredGames = useMemo(() => {
    let result = games;

    // Tag filter
    if (selectedTag) {
      result = result.filter(g =>
        g.game?.genres?.includes(selectedTag)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.game?.name?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy !== 'default') {
      result = [...result];
      switch (sortBy) {
        case 'priority_desc':
          result.sort(
            (a, b) => (b.priority || 0) - (a.priority || 0)
          );
          break;
        case 'hours_desc':
          result.sort(
            (a, b) =>
              (b.hours_played || 0) - (a.hours_played || 0)
          );
          break;
        case 'hours_asc':
          result.sort(
            (a, b) =>
              (a.hours_played || 0) - (b.hours_played || 0)
          );
          break;
        case 'added_desc':
          result.sort(
            (a, b) =>
              new Date(b.added_at).getTime() -
              new Date(a.added_at).getTime()
          );
          break;
        case 'name_asc':
          result.sort((a, b) =>
            (a.game?.name || '').localeCompare(
              b.game?.name || ''
            )
          );
          break;
      }
    }

    return result;
  }, [games, selectedTag, searchQuery, sortBy]);

  // Active columns = primary + visible secondary
  const activeColumns = useMemo(() => {
    return [
      ...PRIMARY_COLUMNS,
      ...SECONDARY_COLUMNS.filter(col =>
        visibleSecondary.has(col.id)
      ),
    ];
  }, [visibleSecondary]);

  // Column stats
  const columnStats = useMemo(() => {
    const stats: Record<
      string,
      { totalHours: number; avgRating: number; favoriteCount: number }
    > = {};
    for (const col of activeColumns) {
      const colGames = filteredGames.filter(
        g => g.status === col.id
      );
      const totalHours = colGames.reduce(
        (sum, g) => sum + (g.hours_played || 0),
        0
      );
      const rated = colGames.filter(
        g => g.user_rating != null && g.user_rating > 0
      );
      const avgRating =
        rated.length > 0
          ? rated.reduce(
              (sum, g) => sum + (g.user_rating || 0),
              0
            ) / rated.length
          : 0;
      const favoriteCount = colGames.filter(
        g => g.is_favorite
      ).length;
      stats[col.id] = { totalHours, avgRating, favoriteCount };
    }
    return stats;
  }, [activeColumns, filteredGames]);

  // Secondary column counts (for toolbar toggle menu)
  const secondaryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of SECONDARY_COLUMNS) {
      counts[col.id] = games.filter(
        g => g.status === col.id
      ).length;
    }
    return counts;
  }, [games]);

  const handleToggleColumn = (status: GameStatus) => {
    setVisibleSecondary(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const game = games.find(g => g.id === event.active.id);
    setActiveGame(game || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGame(null);

    if (!over) return;

    const activeGameId = active.id as string;
    const newStatus = over.id as GameStatus;

    const game = games.find(g => g.id === activeGameId);
    if (!game || game.status === newStatus) return;

    // Optimistic update
    const originalGames = [...games];
    const updatedGames = games.map(g =>
      g.id === activeGameId ? { ...g, status: newStatus } : g
    );
    setGames(updatedGames);

    try {
      await api.userGamesAPI.updateGame(activeGameId, {
        status: newStatus,
      });
    } catch (error) {
      console.error('Update failed:', error);
      setGames(originalGames);
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
    if (!games.some(g => g.status === status)) {
      setClearingColumn(null);
      return;
    }
    // Optimistic update
    const originalGames = [...games];
    setGames(prev => prev.filter(g => g.status !== status));
    setClearingColumn(null);
    try {
      await api.userGamesAPI.bulkDeleteByStatus(status);
    } catch (error) {
      console.error('Clear column failed:', error);
      setGames(originalGames);
    }
  };

  const hasHiddenSecondary =
    SECONDARY_COLUMNS.length > visibleSecondary.size;

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary' />
      </div>
    );
  }

  return (
    <div className='-m-6 md:-m-8 lg:-mx-10 lg:-my-8 flex flex-col h-[calc(100vh-57px)]'>
      {/* Stats Bar */}
      <BoardStatsBar
        games={games}
        columns={ALL_COLUMNS}
        onAddGame={() => setIsAddModalVisible(true)}
      />

      {/* Toolbar */}
      <BoardToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        availableTags={availableTags}
        sortBy={sortBy}
        onSortChange={setSortBy}
        visibleSecondary={visibleSecondary}
        onToggleColumn={handleToggleColumn}
        secondaryColumns={SECONDARY_COLUMNS}
        secondaryCounts={secondaryCounts}
      />

      {/* Board Area */}
      <div className='flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 flex gap-4'>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {activeColumns.map(col => {
            const colGames = filteredGames.filter(
              g => g.status === col.id
            );
            return (
              <BoardColumn
                key={col.id}
                id={col.id}
                title={col.title}
                onClear={() => setClearingColumn(col.id)}
                columnStats={columnStats[col.id]}
              >
                {colGames.map(game => (
                  <DraggableCard
                    key={game.id}
                    game={game}
                    onEdit={() => handleEdit(game)}
                  />
                ))}
              </BoardColumn>
            );
          })}

          {/* More columns zone */}
          {hasHiddenSecondary && (
            <div className='w-[60px] flex-shrink-0 flex flex-col items-center justify-center opacity-40 hover:opacity-70 transition-opacity'>
              <button
                onClick={() => {
                  // Toggle all secondary columns on
                  const allIds = SECONDARY_COLUMNS.map(c => c.id);
                  setVisibleSecondary(new Set(allIds));
                }}
                className='p-2 rounded-xl hover:bg-white/5 transition-colors text-text-secondary'
                title='Show more columns'
              >
                <span className='material-symbols-outlined text-[24px]'>
                  add
                </span>
              </button>
              <span className='text-[10px] text-text-secondary/50 mt-1'>
                More
              </span>
            </div>
          )}

          <DragOverlay>
            {activeGame ? (
              <div
                className='transform rotate-2 cursor-grabbing shadow-2xl'
                style={{ width: '300px' }}
              >
                <GameCard
                  game={activeGame}
                  className='shadow-accent-purple/50'
                  showProgress
                  showAnalysisIndicators
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit Modal */}
      <EditGameModal
        game={editingGame}
        open={isModalVisible}
        onOk={handleUpdateGame}
        onCancel={() => setIsModalVisible(false)}
        onDelete={handleDeleteGame}
      />

      {/* Add Modal */}
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
                  ALL_COLUMNS.find(
                    c => c.id === clearingColumn
                  )?.title
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
              from this column on your board. They will remain
              in your library.
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
