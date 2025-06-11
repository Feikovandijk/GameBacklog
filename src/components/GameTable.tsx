import React, { useState } from 'react';
import {
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Eye,
} from 'lucide-react';
import { Game, GameStatus } from '../types/game';

interface GameTableProps {
  games: Game[];
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}

export function GameTable({ games, onEdit, onDelete }: GameTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: GameStatus) => {
    const colors: Record<GameStatus, string> = {
      Unplayed: 'text-gray-400',
      Unfinished: 'text-blue-400',
      Beaten: 'text-green-400',
      Completed: 'text-emerald-400',
      Endless: 'text-purple-400',
      None: 'text-gray-500',
    };
    return colors[status];
  };
  
  if (games.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-800 rounded-lg">
        <Eye className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white">No games in your backlog</h3>
        <p className="text-gray-400 text-sm mt-1">Click "Add Game" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      <div className="divide-y divide-gray-700">
        {games.map((game) => (
          <div key={game.id} className="group">
            <div className="flex items-center p-4 hover:bg-gray-700/50 transition-colors">
              <button
                onClick={() => toggleExpanded(game.id)}
                className="mr-4 text-gray-500 hover:text-white transition-colors"
              >
                {expandedRows.has(game.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white truncate">
                      {game.title}
                      {game.priority && (
                        <span className="ml-2 text-xs text-orange-400" title="Priority">●</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{game.platform}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${getStatusColor(game.status)}`}>
                      {game.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{game.ownership}</div>
                  </div>
                </div>
              </div>

              <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(game)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(game.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedRows.has(game.id) && (
              <div className="ml-8 pb-4 pr-4">
                <div className="border-l border-gray-700 pl-6">
                  {game.notes ? (
                    <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {game.notes}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No notes for this game.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}