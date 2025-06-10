import React, { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Search,
  Eye
} from 'lucide-react';
import { Game, GameStatus } from '../types/game';

interface GameTableProps {
  games: Game[];
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}

export function GameTable({ games, onEdit, onDelete }: GameTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GameStatus | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'toPlay' | 'playedPlaying'>('toPlay');

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
    const colors = {
      'Unplayed': 'text-gray-600',
      'Unfinished': 'text-blue-600',
      'Beaten': 'text-green-600',
      'Completed': 'text-green-800',
      'Shelved': 'text-red-600',
      'Endless': 'text-purple-600'
    };
    return colors[status];
  };

  // Separate games into two categories
  const gamesToPlay = games.filter(game => 
    game.status === 'Unplayed' || game.status === 'Shelved'
  );
  
  const gamesPlayedPlaying = games.filter(game => 
    game.status === 'Unfinished' || game.status === 'Beaten' || 
    game.status === 'Completed' || game.status === 'Endless'
  );

  const currentGames = activeTab === 'toPlay' ? gamesToPlay : gamesPlayedPlaying;

  const filteredAndSortedGames = currentGames
    .filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || game.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by priority first, then by date modified
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
    });

  const getGameStats = () => {
    const total = games.length;
    const completed = games.filter(g => g.status === 'Completed').length;
    const beaten = games.filter(g => g.status === 'Beaten').length;
    const unplayed = games.filter(g => g.status === 'Unplayed').length;
    const unfinished = games.filter(g => g.status === 'Unfinished').length;
    const priority = games.filter(g => g.priority).length;
    const shelved = games.filter(g => g.status === 'Shelved').length;
    const endless = games.filter(g => g.status === 'Endless').length;
    
    return { total, completed, beaten, unplayed, unfinished, priority, shelved, endless };
  };

  const stats = getGameStats();

  const getFilteredStatusOptions = () => {
    if (activeTab === 'toPlay') {
      return ['All', 'Unplayed', 'Shelved'];
    } else {
      return ['All', 'Unfinished', 'Beaten', 'Completed', 'Endless'];
    }
  };

  if (games.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto mb-6 text-gray-300">
          <Eye className="w-16 h-16" />
        </div>
        <h3 className="text-lg font-light text-gray-900 mb-2">No games yet</h3>
        <p className="text-gray-500 text-sm">Add your first game to start tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-8">
        <div className="text-center">
          <div className="text-3xl font-light text-gray-900 mb-1">{stats.total}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-gray-600 mb-1">{stats.unplayed}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Unplayed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-green-600 mb-1">{stats.completed}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-light text-orange-600 mb-1">{stats.priority}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Priority</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('toPlay')}
            className={`pb-4 text-sm font-light transition-colors ${
              activeTab === 'toPlay'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            To Play ({gamesToPlay.length})
          </button>
          <button
            onClick={() => setActiveTab('playedPlaying')}
            className={`pb-4 text-sm font-light transition-colors ${
              activeTab === 'playedPlaying'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Played ({gamesPlayedPlaying.length})
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as GameStatus | 'All')}
          className="text-sm border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent"
        >
          {getFilteredStatusOptions().map(status => (
            <option key={status} value={status}>
              {status === 'All' ? 'All' : status}
            </option>
          ))}
        </select>
      </div>

      {/* Games List */}
      {filteredAndSortedGames.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-light text-gray-900 mb-2">
            {activeTab === 'toPlay' ? 'No games to play' : 'No games played'}
          </h3>
          <p className="text-gray-500 text-sm">
            {activeTab === 'toPlay' 
              ? 'Add games with "Unplayed" or "Shelved" status'
              : 'Games you\'ve played will appear here'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredAndSortedGames.map((game) => (
            <div key={game.id} className="group">
              <div className="flex items-center py-4 hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => toggleExpanded(game.id)}
                  className="mr-4 text-gray-400 hover:text-gray-600 transition-colors"
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
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {game.title}
                        {game.priority && (
                          <span className="ml-2 text-xs text-orange-600">●</span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{game.platform}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${getStatusColor(game.status)}`}>
                        {game.status}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{game.ownership}</div>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(game)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(game.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedRows.has(game.id) && (
                <div className="ml-8 pb-6 pr-4">
                  <div className="border-l border-gray-200 pl-6">
                    {game.notes ? (
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {game.notes}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No notes</div>
                    )}
                    <div className="text-xs text-gray-400 mt-4">
                      Added {new Date(game.dateAdded).toLocaleDateString()} • 
                      Modified {new Date(game.dateModified).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}