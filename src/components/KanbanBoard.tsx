import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Game, GameStatus } from '../types/game';

interface KanbanBoardProps {
  games: Game[];
  setGames: React.Dispatch<React.SetStateAction<Game[]>>;
}

const statusColumns: GameStatus[] = ['Inbox', 'To Play', 'Playing', 'Done', 'Discarded'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ games, setGames }) => {
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as GameStatus;

    setGames(prevGames =>
      prevGames.map(game =>
        game.id === draggableId
          ? { ...game, status: newStatus, dateModified: new Date().toISOString() }
          : game
      )
    );
  };

  const gamesByStatus = (status: GameStatus) => {
    return games
      .filter(game => game.status === status)
      .sort((a, b) => (a.priority === b.priority) ? 0 : a.priority ? -1 : 1);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-5 gap-4">
        {statusColumns.map(status => (
          <Droppable droppableId={status} key={status}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`bg-gray-800 p-4 rounded-lg ${snapshot.isDraggingOver ? 'bg-gray-700' : ''}`}
              >
                <h2 className="font-bold text-lg mb-4 text-white">{status}</h2>
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
                          <h3 className="font-semibold text-white">{game.title}</h3>
                          <p className="text-sm text-gray-400">{game.platform}</p>
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