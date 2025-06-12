import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';
import { Edit, Trash2, Plus, Inbox, CheckSquare, XSquare, Download, LogIn } from 'lucide-react';
import { GameModal } from '../components/GameModal';
import { useAuth } from '../contexts/AuthContext';

const WORKER_URL = import.meta.env.VITE_WISHLIST_WORKER_URL;
const API_BASE_URL = 'http://localhost:3001';

const Wishlist: React.FC = () => {
  const { user, loginWithSteam, loading: authLoading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(games.map(g => g.id)));
  const clearSelection = () => setSelected(new Set());

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setModalOpen(true);
  };
  const handleDelete = (id: string) => {
    const updatedGames = games.filter(g => g.id !== id);
    setGames(updatedGames);
    saveWishlist(updatedGames);
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  };
  const handleBulkDelete = () => {
    const updatedGames = games.filter(g => !selected.has(g.id));
    setGames(updatedGames);
    saveWishlist(updatedGames);
    clearSelection();
  };
  const handleBulkAddToBacklog = () => {
    const updatedGames = games.map(g => selected.has(g.id) ? { ...g, status: 'backlog' as const, ownership: 'owned' as const } : g);
    setGames(updatedGames);
    saveWishlist(updatedGames);
    clearSelection();
  };
  const handleSaveGame = (gameData: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>) => {
    if (editingGame) {
      const updatedGames = games.map(g => g.id === editingGame.id ? { ...editingGame, ...gameData, dateModified: new Date().toISOString() } : g);
      setGames(updatedGames);
      saveWishlist(updatedGames);
    }
    setModalOpen(false);
    setEditingGame(null);
  };

  const saveWishlist = async (updatedGames: Game[]) => {
    if (!user?.steamId) return;
    try {
      await fetch(`${API_BASE_URL}/api/wishlist/${user.steamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGames),
      });
    } catch (err) {
      console.error('Failed to save wishlist:', err);
      // Optionally, show an error to the user
    }
  };

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.steamId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/wishlist/${user.steamId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setGames(data);
        }
      } catch (err) {
        console.error('Failed to fetch wishlist:', err);
      }
    };
    fetchWishlist();
  }, [user]);

  // Log env for debugging
  console.log('import.meta.env:', import.meta.env);
  console.log('WORKER_URL:', WORKER_URL);

  // Import from Steam (requires user to be logged in)
  const handleImport = async () => {
    if (!user?.steamId) return;
    if (!WORKER_URL) {
      setImportError('Wishlist worker URL is not set. Please check your .env and restart the dev server.');
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      console.log('WORKER_URL:', WORKER_URL);
      console.log('user.steamId:', user.steamId);
      const res = await fetch(`${WORKER_URL}?steamId=${encodeURIComponent(user.steamId)}`);
      const text = await res.text();
      console.log('Raw response:', text);
      const imported = JSON.parse(text);
      // Map to Game type and merge, avoiding duplicates
      const importedGames: Game[] = imported.map((g: any) => ({
        id: g.id,
        title: g.title,
        description: '',
        platform: 'PC',
        status: 'wishlist',
        ownership: 'wishlist',
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        rating: 0,
        playtime: 0,
        genre: g.genre || '',
        priority: false,
        notes: g.notes || '',
      }));
      // Avoid duplicates by id
      const existingIds = new Set(games.map(g => g.id));
      const merged = [...games, ...importedGames.filter(g => !existingIds.has(g.id))];
      setGames(merged);
      await saveWishlist(merged);
    } catch (err: any) {
      setImportError(err.message || 'Unknown error');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="bg-[#1b232a] min-h-screen text-gray-200 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-gray-700 bg-[#232b32]">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Inbox className="w-6 h-6" /> Wishlist Inbox</h1>
        {user ? (
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
            onClick={handleImport}
            disabled={importLoading}
          >
            <Download className="w-4 h-4" />
            {importLoading ? 'Importing...' : 'Import from Steam'}
          </button>
        ) : (
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
            onClick={loginWithSteam}
            disabled={authLoading}
          >
            <LogIn className="w-4 h-4" /> Log in with Steam
          </button>
        )}
      </div>
      <div className="p-8">
        {/* Show error if import fails */}
        {importError && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded">{importError}</div>
        )}
        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-700 rounded-md">
            <span className="text-sm text-gray-200">{selected.size} selected</span>
            <button className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs" onClick={handleBulkAddToBacklog}>
              <CheckSquare className="w-4 h-4" /> Add to Backlog
            </button>
            <button className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs" onClick={handleBulkDelete}>
              <XSquare className="w-4 h-4" /> Remove
            </button>
            <button className="ml-auto text-xs text-gray-400 hover:text-white" onClick={clearSelection}>Clear</button>
          </div>
        )}
        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full bg-[#232b32] text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="px-2 py-3"><input type="checkbox" checked={selected.size === games.length} onChange={e => e.target.checked ? selectAll() : clearSelection()} /></th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-2 py-3">Platform</th>
                <th className="px-2 py-3">Genre</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Ownership</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">No games in your wishlist inbox.<br />Click "Import from Steam" to get started.</td></tr>
              ) : games.map(game => (
                <tr key={game.id} className="border-b border-gray-800 hover:bg-[#28313a] transition">
                  <td className="px-2 py-2 text-center"><input type="checkbox" checked={selected.has(game.id)} onChange={() => toggleSelect(game.id)} /></td>
                  <td className="px-4 py-2 font-medium flex items-center gap-2 text-white">{game.title}</td>
                  <td className="px-2 py-2 text-center">{game.platform}</td>
                  <td className="px-2 py-2 text-center">{game.genre}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${game.status === 'wishlist' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>{game.status}</span>
                  </td>
                  <td className="px-2 py-2 text-center">{game.ownership}</td>
                  <td className="px-2 py-2 text-center flex gap-2 justify-center">
                    <button className="p-1 text-gray-400 hover:text-green-400" title="Add to Backlog" onClick={() => {
                      const updatedGames = games.map(g => g.id === game.id ? { ...g, status: 'backlog' as const, ownership: 'owned' as const } : g);
                      setGames(updatedGames);
                      saveWishlist(updatedGames);
                    }}><Plus className="w-4 h-4" /></button>
                    <button className="p-1 text-gray-400 hover:text-white" title="Edit" onClick={() => handleEdit(game)}><Edit className="w-4 h-4" /></button>
                    <button className="p-1 text-gray-400 hover:text-red-500" title="Remove" onClick={() => handleDelete(game.id)}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Edit Modal */}
        {isModalOpen && editingGame && (
          <GameModal
            isOpen={isModalOpen}
            onClose={() => { setModalOpen(false); setEditingGame(null); }}
            onSave={handleSaveGame}
            game={editingGame}
            title="Edit Game"
          />
        )}
      </div>
    </div>
  );
};

export default Wishlist; 