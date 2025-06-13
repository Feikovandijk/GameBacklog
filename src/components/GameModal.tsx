import React, { useState, useEffect, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Game, GAME_STATUSES, OWNERSHIP_STATUSES, GameStatus, OwnershipStatus } from '../types/game';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../contexts/AuthContext';

interface SteamApp {
  appid: number;
  name: string;
}

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>, steamAppId?: string) => void;
  game?: Game;
  title: string;
}

export function GameModal({ isOpen, onClose, onSave, game, title }: GameModalProps) {
  const [steamSearchTerm, setSteamSearchTerm] = useState('');
  const [steamSearchResults, setSteamSearchResults] = useState<SteamApp[]>([]);
  const [steamAppList, setSteamAppList] = useLocalStorage<SteamApp[]>('steamAppList', []);
  const [isFetchingAppList, setIsFetchingAppList] = useState(false);
  const [selectedGameHeader, setSelectedGameHeader] = useState<string | null>(null);
  const [selectedSteamAppId, setSelectedSteamAppId] = useState<string | null>(null);
  const { user } = useAuth();

  const initialFormData = {
    title: '',
    platform: '',
    genre: '',
    status: 'backlog' as GameStatus,
    ownership: 'owned' as OwnershipStatus,
    priority: false,
    notes: '',
    imageUrl: '',
    playtime: 0,
    playtime2Weeks: 0,
    achievements: { unlocked: 0, total: 0 },
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (game) {
        setFormData({
          title: game.title,
          platform: game.platform,
          genre: game.genre || '',
          status: game.status,
          ownership: game.ownership,
          priority: game.priority,
          notes: game.notes,
          imageUrl: game.imageUrl || '',
          playtime: game.playtime || 0,
          playtime2Weeks: game.playtime2Weeks || 0,
          achievements: game.achievements || { unlocked: 0, total: 0 },
        });
        
        // If it's a Steam game (i.e., has a numeric ID), always refresh its stats and image
        if (game.id && !isNaN(parseInt(game.id))) {
          handleFetchSteamInfo(game.id, true);
        } else if (game.imageUrl) {
          // For non-steam games with a manually added image
          setSelectedGameHeader(game.imageUrl);
        }

      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setSteamSearchTerm('');
      setSteamSearchResults([]);
      // Only clear header image if we are not editing a game
      if (!game) {
        setSelectedGameHeader(null);
        setSelectedSteamAppId(null);
      }
    }
  }, [game, isOpen]);

  const handleFetchSteamAppList = async () => {
    setIsFetchingAppList(true);
    try {
      const response = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.steampowered.com/ISteamApps/GetAppList/v2/'));
      if (!response.ok) throw new Error('Failed to fetch Steam app list.');
      const data = await response.json();
      if (data.applist?.apps) {
        setSteamAppList(data.applist.apps);
      }
    } catch (error) {
      console.error(error);
      setErrors(prev => ({ ...prev, steam: 'Failed to download Steam games list.' }));
    } finally {
      setIsFetchingAppList(false);
    }
  };

  useEffect(() => {
    if (steamSearchTerm.length > 2) {
      const results = steamAppList
        .filter(app => app.name.toLowerCase().includes(steamSearchTerm.toLowerCase()))
        .slice(0, 100);
      setSteamSearchResults(results);
    } else {
      setSteamSearchResults([]);
    }
  }, [steamSearchTerm, steamAppList]);

  const handleFetchSteamInfo = async (appId: string, onlyFetchHeader = false) => {
    if (!appId) return;
    setErrors({});
    setSelectedSteamAppId(appId);
    try {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://store.steampowered.com/api/appdetails?appids=${appId}`)}`);
      if (!response.ok) throw new Error('Failed to fetch data from Steam.');
      const data = await response.json();
      const gameData = data[appId].data;

      if (gameData) {
        if (user?.steamId) {
          try {
            const statsResponse = await fetch(`http://localhost:3001/api/player-game-stats/${user.steamId}/${appId}`);
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              const playtimeHours = Math.round(statsData.playtime_forever / 60);
              const playtime2WeeksMinutes = statsData.playtime_2weeks || 0;
              setFormData(prev => ({ ...prev, playtime: playtimeHours, playtime2Weeks: playtime2WeeksMinutes, achievements: statsData.achievements }));
            }
          } catch (e) {
            console.error("Could not pre-fill stats", e);
          }
        }
        
        setSelectedGameHeader(gameData.header_image);
        setFormData(prev => ({ ...prev, imageUrl: gameData.header_image || '' }));
        
        if (onlyFetchHeader) return;

        const platforms: string[] = [];
        if (gameData.platforms?.windows) platforms.push('PC');
        if (gameData.platforms?.mac) platforms.push('Mac');
        if (gameData.platforms?.linux) platforms.push('Linux');

        const genres = gameData.genres?.map((g: any) => g.description).join(', ') || '';
        
        setFormData(prev => ({
          ...prev,
          title: gameData.name || prev.title,
          platform: platforms.join(', ') || prev.platform,
          genre: genres,
          notes: `${gameData.short_description || ''}`,
          imageUrl: gameData.header_image || '',
          playtime: gameData.playtime || 0,
          playtime2Weeks: gameData.playtime2Weeks || 0,
          achievements: gameData.achievements || { unlocked: 0, total: 0 },
        }));
      } else {
        throw new Error('Invalid Steam App ID or no data found.');
      }
    } catch (error) {
      console.error(error);
      setErrors(prev => ({ ...prev, steam: 'Failed to fetch Steam data.' }));
    } finally {
      setSteamSearchTerm('');
      setSteamSearchResults([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.platform.trim()) newErrors.platform = 'Platform is required';
    if (!formData.genre.trim()) newErrors.genre = 'Genre is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        description: '',
        rating: 0,
      }, selectedSteamAppId || undefined);
      onClose();
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const InputField = (props: InputHTMLAttributes<HTMLInputElement> & { label: string, id: string }) => {
    const { label, id, ...rest } = props;
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
          id={id}
          name={id}
          value={formData[id as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(id, e.target.value)}
          className={`w-full px-3 py-2 text-sm bg-gray-700 border text-white rounded-md transition-colors ${
            errors[id] ? 'border-red-500' : 'border-gray-600 focus:border-indigo-500'
          }`}
          {...rest}
        />
        {errors[id] && <p className="text-xs text-red-400 mt-1">{errors[id]}</p>}
      </div>
    );
  };

  const SelectField = (props: SelectHTMLAttributes<HTMLSelectElement> & { label: string, id: string, options: readonly string[] }) => {
    const { label, id, options, ...rest } = props;
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <select
          id={id}
          name={id}
          value={formData[id as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(id, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-gray-700 text-white focus:border-indigo-500"
          {...rest}
        >
          {options.map(option => <option key={option} value={option} className="bg-gray-700 text-white">{option}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col text-gray-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          {selectedGameHeader && <img src={selectedGameHeader} alt="Game Header" className="w-full h-48 object-cover" />}
          
          {!game && (
            <div className="p-6 space-y-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-400">Import from Steam</label>
                <button onClick={handleFetchSteamAppList} disabled={isFetchingAppList} className="text-gray-400 hover:text-white disabled:opacity-50" title="Update Steam games list">
                  <RefreshCw className={`w-4 h-4 ${isFetchingAppList ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div>
                <input
                  type="text"
                  value={steamSearchTerm}
                  onChange={(e) => setSteamSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 text-white rounded-md"
                  placeholder="Search Steam..."
                  onFocus={() => steamAppList.length === 0 && handleFetchSteamAppList()}
                />
                {steamAppList.length > 0 && <span className="text-xs text-gray-500 mt-1">{steamAppList.length} games cached</span>}
              </div>
              {steamSearchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-md bg-gray-800">
                  {steamSearchResults.map(app => (
                    <div key={app.appid} onClick={() => handleFetchSteamInfo(String(app.appid))} className="px-3 py-2 cursor-pointer hover:bg-gray-700 text-sm">
                      {app.name}
                    </div>
                  ))}
                </div>
              )}
              {errors.steam && <p className="text-xs text-red-400 mt-1">{errors.steam}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField id="title" label="Title" required />
              <InputField id="platform" label="Platform" required />
            </div>
            <InputField id="genre" label="Genre" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField id="status" label="Status" options={GAME_STATUSES} />
              <SelectField id="ownership" label="Ownership" options={OWNERSHIP_STATUSES} />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 text-white rounded-md focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                id="priority"
                name="priority"
                type="checkbox"
                checked={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-600 rounded bg-gray-700 focus:ring-indigo-500"
              />
              <label htmlFor="priority" className="ml-2 block text-sm text-gray-300">High Priority</label>
            </div>
          </form>
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">
            Save Game
          </button>
        </div>
      </div>
    </div>
  );
}