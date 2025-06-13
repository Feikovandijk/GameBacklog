import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Game, GameStatus } from '../types/game';
import { useGames } from '../contexts/GamesContext';
import { GameModal } from './GameModal';
import { Plus, Star, Trash2 } from 'lucide-react';

const statusColumns: GameStatus[] = ['backlog', 'playing', 'beaten', 'completed', 'endless', 'dropped'];

const statusColumnColors: Record<GameStatus, { bg: string; text: string }> = {
  backlog:   { bg: 'bg-[#2a3b47]', text: 'text-gray-300' },
  playing:   { bg: 'bg-[#4a4a28]', text: 'text-yellow-300' },
  beaten:    { bg: 'bg-[#2a4a3b]', text: 'text-green-300' },
  completed: { bg: 'bg-[#1f3a5f]', text: 'text-blue-300' },
  endless:   { bg: 'bg-[#4a2a4a]', text: 'text-purple-300' },
  dropped:   { bg: 'bg-[#4a2a2a]', text: 'text-red-300' },
};

export const KanbanBoard: React.FC = () => {
  const { games, updateGameStatus, saveGame, deleteGame } = useGames();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>(undefined);

  const handleTogglePriority = (game: Game) => {
    saveGame({ ...game, priority: !game.priority }, game);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    updateGameStatus(draggableId, destination.droppableId as GameStatus);
  };

  const gamesByStatus = (status: GameStatus) =>
    games.filter(game => game.status === status)
         .sort((a, b) => (a.priority === b.priority ? 0 : a.priority ? -1 : 1));

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, steamAppId?: string) => {
    saveGame(gameData, editingGame || null, steamAppId);
    setModalOpen(false);
    setEditingGame(undefined);
  };

  const handleAddGameClick = () => {
    setEditingGame(undefined);
    setModalOpen(true);
  };

  const handleCardClick = (game: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGame(undefined);
  };

  return (
    <div className="bg-[#1b232a] min-h-screen font-sans">
      <div className="flex items-center justify-between p-8 border-b border-gray-700 bg-[#232b32]">
        <h1 className="text-2xl font-bold text-white">Game Backlog</h1>
        <button
          onClick={handleAddGameClick}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Game
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {statusColumns.map(status => (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col rounded-lg shadow-lg ${statusColumnColors[status].bg} ${snapshot.isDraggingOver ? 'ring-2 ring-indigo-500' : ''}`}
                  style={{ minHeight: '60vh' }}
                >
                  <h2 className={`text-lg font-bold p-4 capitalize border-b border-white/10 ${statusColumnColors[status].text}`}>
                    {status} ({gamesByStatus(status).length})
                  </h2>
                  <div className="p-4 space-y-4 overflow-y-auto flex-grow">
                    {gamesByStatus(status).map((game, index) => (
                      <Draggable key={game.id} draggableId={game.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleCardClick(game)}
                            className={`group p-3 rounded-md bg-[#232b32] border border-gray-700 hover:border-indigo-500 transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-2xl scale-105' : 'shadow-md'}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold text-white pr-2 flex-grow">{game.title}</span>
                              <div className="flex flex-col items-center shrink-0 -mt-1 -mr-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePriority(game);
                                  }}
                                  className="p-1 text-gray-500 hover:text-yellow-400"
                                  title="Toggle Priority"
                                >
                                  <Star className={`w-4 h-4 transition-all ${game.priority ? 'text-yellow-400 fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGame(game.id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete Game"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{game.platform}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {isModalOpen && (
        <GameModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveGame}
          game={editingGame}
          title={editingGame ? 'Edit Game' : 'Add a New Game'}
        />
      )}
    </div>
  );
}; 