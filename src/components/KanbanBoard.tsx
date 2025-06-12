import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Game, GameStatus } from '../types/game';
import { useGames } from '../contexts/GamesContext';

const statusColumns: GameStatus[] = ['backlog', 'playing', 'completed', 'dropped'];

const statusColumnColors: Record<GameStatus, string> = {
  'backlog': 'bg-gray-800',
  'playing': 'bg-orange-500/10',
  'completed': 'bg-green-500/10',
  'dropped': 'bg-zinc-800',
  'wishlist': 'bg-purple-500 text-white'
};

const statusTagColors: Record<GameStatus, string> = {
  'backlog': 'bg-gray-500 text-white',
  'playing': 'bg-orange-500 text-white',
  'completed': 'bg-green-500 text-white',
  'dropped': 'bg-zinc-600 text-white',
  'wishlist': 'bg-purple-500 text-white'
};

export const KanbanBoard: React.FC = () => {
  const { games, updateGameStatus } = useGames();

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as GameStatus;

    updateGameStatus(draggableId, newStatus);
  };

  const gamesByStatus = (status: GameStatus) => {
    return games
      .filter(game => game.status === status)
      .sort((a, b) => (a.priority === b.priority) ? 0 : a.priority ? -1 : 1);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map(status => (
          <Droppable droppableId={status} key={status}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`p-4 rounded-lg ${snapshot.isDraggingOver ? 'bg-gray-700' : statusColumnColors[status]}`}
              >
                <h2 className="font-bold text-lg mb-4 text-white capitalize">{status}</h2>
                <div className="space-y-4">
                  {gamesByStatus(status).map((game, index) => (
                    <Draggable key={game.id} draggableId={game.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-gray-900 p-4 rounded-md shadow-md ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">{game.title}</h3>
                              <p className="text-sm text-gray-400">{game.platform}</p>
                            </div>
                            <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full ${statusTagColors[game.status]}`}>
                              {game.status}
                            </span>
                          </div>
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
  );
}; 