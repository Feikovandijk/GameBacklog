import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Game, GAME_STATUSES, OWNERSHIP_STATUSES, GameStatus, OwnershipStatus } from '../types/game';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: Omit<Game, 'id' | 'dateAdded' | 'dateModified'>) => void;
  game?: Game;
  title: string;
}

export function GameModal({ isOpen, onClose, onSave, game, title }: GameModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    platform: '',
    status: 'Unplayed' as GameStatus,
    ownership: 'Digital' as OwnershipStatus,
    priority: false,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (game) {
      setFormData({
        title: game.title,
        platform: game.platform,
        status: game.status,
        ownership: game.ownership,
        priority: game.priority,
        notes: game.notes
      });
    } else {
      setFormData({
        title: '',
        platform: '',
        status: 'Unplayed',
        ownership: 'Digital',
        priority: false,
        notes: ''
      });
    }
    setErrors({});
  }, [game, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Game title is required';
    }
    
    if (!formData.platform.trim()) {
      newErrors.platform = 'Platform is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <h2 className="text-lg font-light text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm text-gray-700 mb-3">
                Game Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-0 py-2 text-sm border-0 border-b focus:outline-none transition-colors ${
                  errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-400'
                }`}
                placeholder="Enter game title"
              />
              {errors.title && (
                <div className="text-xs text-red-600 mt-2">{errors.title}</div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-3">
                Platform
              </label>
              <input
                type="text"
                value={formData.platform}
                onChange={(e) => handleInputChange('platform', e.target.value)}
                className={`w-full px-0 py-2 text-sm border-0 border-b focus:outline-none transition-colors ${
                  errors.platform ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-400'
                }`}
                placeholder="PC, PlayStation 5, Nintendo Switch"
              />
              {errors.platform && (
                <div className="text-xs text-red-600 mt-2">{errors.platform}</div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-3">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as GameStatus)}
                className="w-full px-0 py-2 text-sm border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent"
              >
                {GAME_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-3">
                Ownership
              </label>
              <select
                value={formData.ownership}
                onChange={(e) => handleInputChange('ownership', e.target.value as OwnershipStatus)}
                className="w-full px-0 py-2 text-sm border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent"
              >
                {OWNERSHIP_STATUSES.map(ownership => (
                  <option key={ownership} value={ownership}>{ownership}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.checked)}
                className="w-4 h-4 text-gray-900 bg-white border-gray-300 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-700">High Priority</span>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-3">
              Notes & Analysis
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={8}
              className="w-full px-0 py-2 text-sm border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none resize-none"
              placeholder="Game mechanics, level design, narrative, art style..."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}