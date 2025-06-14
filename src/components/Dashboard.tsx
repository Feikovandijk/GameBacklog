import React, { useState, useMemo } from 'react';
import { Game, GameStatus } from '../types/game';
import { useGames } from '../contexts/GamesContext';
import { useNavigate } from 'react-router-dom';
import { Search, List as ListIcon, Columns, ChevronDown, Star, Trash2, Calendar, Clock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GameModal } from './GameModal';

const StatItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-medium text-gray-200 truncate" title={typeof value === 'string' ? value : ''}>{value}</p>
  </div>
);

const GameListItem: React.FC<{ game: Game; onClick: () => void; onTogglePriority: () => void, onDelete: () => void }> = ({ game, onClick, onTogglePriority, onDelete }) => {
    const getStatusBadgeColor = (status: GameStatus) => {
      const colorMap: Record<GameStatus, string> = {
          backlog: 'bg-gray-600 text-gray-200',
          playing: 'bg-green-500/80 text-green-100',
          beaten: 'bg-sky-500/80 text-sky-100',
          completed: 'bg-blue-600/80 text-blue-100',
          endless: 'bg-purple-500/80 text-purple-100',
          dropped: 'bg-red-500/80 text-red-100',
      };
      return colorMap[status] || 'bg-gray-400 text-white';
    };
  
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
      });
    }
  
    return (
      <div 
          onClick={onClick}
          className="group bg-[#2a343d] p-3 rounded-lg border border-gray-700/50 flex items-center gap-4 hover:border-indigo-500 transition-all duration-200 cursor-pointer">
        
        <div className="flex items-center gap-4 flex-none" style={{ width: '30%' }}>
            <img 
              src={game.imageUrl || `https://placehold.co/64x64/1b232a/ffffff?text=${encodeURIComponent(game.title)}`} 
              alt={game.title} 
              className="w-16 h-16 rounded-md object-cover flex-shrink-0" 
            />
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTogglePriority(); }}
                      className="text-gray-500 flex-shrink-0" title="Toggle Priority">
                      <Star className={`w-5 h-5 transition-all duration-200 ${game.priority ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`} />
                    </button>
                    <h3 className="text-base font-bold text-white truncate" title={game.title}>{game.title}</h3>
                </div>
                <p className="text-sm text-gray-400 truncate" title={game.platform}>{game.platform}</p>
            </div>
      </div>

        <div className="flex-grow grid grid-cols-4 gap-4 items-center text-center">
            <StatItem label="Playtime" value={game.playtime > 0 ? `${Math.round(game.playtime / 60)}h` : 'N/A'} />
            <StatItem label="Developer" value={game.developer || 'N/A'} />
            <StatItem label="Publisher" value={game.publisher || 'N/A'} />
            <StatItem label="Released" value={game.releaseDate ? formatDate(game.releaseDate) : 'N/A'} />
      </div>

        <div className="flex-none flex items-center gap-4 justify-end" style={{ width: '15%' }}>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(game.status)}`}>
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-gray-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
              title="Delete Game">
          <Trash2 className="w-4 h-4" />
        </button>
        </div>
    </div>
  );
};

const statusColumns: GameStatus[] = ['backlog', 'playing', 'beaten', 'completed', 'endless', 'dropped'];

const statusColumnColors: Record<GameStatus, { bg: string; text: string }> = {
  backlog:   { bg: 'bg-[#2a3b47]', text: 'text-gray-300' },
  playing:   { bg: 'bg-[#4a4a28]', text: 'text-yellow-300' },
  beaten:    { bg: 'bg-[#2a4a3b]', text: 'text-green-300' },
  completed: { bg: 'bg-[#1f3a5f]', text: 'text-blue-300' },
  endless:   { bg: 'bg-[#4a2a4a]', text: 'text-purple-300' },
  dropped:   { bg: 'bg-[#4a2a2a]', text: 'text-red-300' },
};


export const Dashboard: React.FC = () => {
  const { games, updateGameStatus, saveGame, deleteGame } = useGames();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [view, setView] = useState<'list' | 'board'>('list');
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>(undefined);

  const handleCardClick = (game: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGame(undefined);
  };

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, steamAppId?: string) => {
    saveGame(gameData, editingGame || null, steamAppId);
    handleCloseModal();
  };

  const { uniquePlatforms, uniqueGenres, uniqueStatuses } = useMemo(() => {
    const platforms = new Set<string>();
    const genres = new Set<string>();
    const statuses = new Set<string>();

    games.forEach(game => {
      if (game.platform) platforms.add(game.platform);
      if (game.status) statuses.add(game.status);
      if (game.genre) {
        game.genre.split(',').forEach(g => genres.add(g.trim()));
      }
    });

    return {
      uniquePlatforms: ['All Platforms', ...Array.from(platforms)],
      uniqueGenres: ['All Genres', ...Array.from(genres)],
      uniqueStatuses: ['All Status', ...Array.from(statuses)],
    };
  }, [games]);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || game.status === statusFilter;
      const matchesPlatform = platformFilter === 'All Platforms' || game.platform === platformFilter;
      const matchesGenre = genreFilter === 'All Genres' || (game.genre && game.genre.split(',').map(g => g.trim()).includes(genreFilter));

      return matchesSearch && matchesStatus && matchesPlatform && matchesGenre;
    }).sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });
  }, [games, searchTerm, statusFilter, platformFilter, genreFilter]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    updateGameStatus(draggableId, destination.droppableId as GameStatus);
  };

  const gamesByStatus = (status: GameStatus) =>
    filteredGames.filter(game => game.status === status)
         .sort((a, b) => (a.priority === b.priority ? 0 : a.priority ? -1 : 1));

  const handleTogglePriority = (game: Game) => {
    saveGame({ ...game, priority: !game.priority }, game);
  };

  const FilterDropdown: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
    disabled?: boolean;
  }> = ({ value, onChange, options, disabled }) => (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="bg-[#2a343d] border border-transparent hover:border-gray-600 text-gray-300 text-sm rounded-lg pl-4 pr-8 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
  
  const ViewButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }> = ({ label, icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
    <div className="bg-[#1b232a] min-h-full text-gray-200 font-sans p-8 space-y-6">
      {/* Filter Bar */}
      <div className="bg-[#232b32]/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-grow">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#2a343d] border border-transparent hover:border-gray-600 w-full text-sm rounded-lg pl-10 pr-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <FilterDropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={uniqueStatuses} disabled={view === 'board'} />
          <FilterDropdown value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} options={uniquePlatforms} disabled={view === 'board'}/>
          <FilterDropdown value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} options={uniqueGenres} disabled={view === 'board'}/>
        </div>
        <div className="flex items-center bg-[#2a343d] p-1 rounded-lg">
           <ViewButton label="List" icon={<ListIcon size={16} />} active={view === 'list'} onClick={() => setView('list')} />
           <ViewButton label="Board" icon={<Columns size={16} />} active={view === 'board'} onClick={() => setView('board')} />
        </div>
      </div>

      {/* Game Display */}
      {view === 'list' && (
            <div className="space-y-4">
            {filteredGames.map(game => (
                <GameListItem 
                  key={game.id} 
                  game={game} 
                  onClick={() => handleCardClick(game)} 
                  onTogglePriority={() => handleTogglePriority(game)}
                  onDelete={() => deleteGame(game.id)}
                />
            ))}
                  </div>
      )}
       {view === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
                                <div className="flex items-center shrink-0 -mt-1 -mr-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePriority(game);
                                      }}
                                      className="p-1 text-gray-500"
                                      title="Toggle Priority"
                                    >
                                      <Star className={`w-4 h-4 transition-all ${game.priority ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`} />
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
          )}

      {filteredGames.length === 0 && view !== 'board' && (
          <div className="text-center py-16">
              <p className="text-gray-400">No games match your filters.</p>
          </div>
      )}
      </div>
      {isModalOpen && (
        <GameModal
          isOpen={isModalOpen}
            onClose={handleCloseModal}
          onSave={handleSaveGame}
          game={editingGame}
          title={editingGame ? 'Edit Game' : 'Add a New Game'}
        />
      )}
    </>
  );
}; 