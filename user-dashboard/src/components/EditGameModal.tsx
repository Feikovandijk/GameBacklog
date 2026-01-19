import React, { useState, useEffect } from 'react';
import type { UserGame } from '../services/api';

interface EditGameModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: Partial<UserGame>) => void;
  onDelete: () => void;
  game: UserGame | null;
}

const EditGameModal: React.FC<EditGameModalProps> = ({
  open,
  onCancel,
  onOk,
  onDelete,
  game,
}) => {
  const [formData, setFormData] = useState<{
    status: string;
    user_notes: string;
  }>({
    status: '',
    user_notes: '',
  });

  useEffect(() => {
    if (open && game) {
      setFormData({
        status: game.status,
        user_notes: game.user_notes || '',
      });
    }
  }, [open, game]);

  if (!open || !game) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOk({
      ...formData,
      status: formData.status as UserGame['status'],
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
      <div
        className='bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/5'>
          <h2 className='text-xl font-bold text-white'>Edit Game</h2>
          <button
            onClick={onCancel}
            className='text-text-secondary hover:text-white transition-colors'
          >
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 max-h-[70vh] overflow-y-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
            {/* Game Cover */}
            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>
                Game Cover
              </label>
              <div className='aspect-video rounded-xl overflow-hidden border border-white/10 bg-background-dark'>
                <img
                  src={game.game?.header_image}
                  alt={game.game?.name}
                  className='w-full h-full object-cover'
                />
              </div>
            </div>

            {/* Info */}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-text-secondary mb-1'>
                  Game Title
                </label>
                <div className='px-4 py-2.5 bg-background-dark/50 border border-white/5 rounded-xl text-white opacity-80'>
                  {game.game?.name}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-text-secondary mb-1'>
                  Genre
                </label>
                <div className='px-4 py-2.5 bg-background-dark/50 border border-white/5 rounded-xl text-white opacity-80'>
                  {game.game?.genres?.join(', ') || 'N/A'}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-text-secondary mb-1'>
                  Platform
                </label>
                <div className='px-4 py-2.5 bg-background-dark/50 border border-white/5 rounded-xl text-white opacity-80'>
                  {game.game?.publishers?.join(', ') || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <form id='edit-game-form' onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-text-secondary mb-2'>
                  Status <span className='text-status-dropped'>*</span>
                </label>
                <div className='relative'>
                  <select
                    className='block w-full pl-3 pr-10 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm'
                    value={formData.status}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, status: e.target.value }))
                    }
                    required
                  >
                    <option value='want_to_play'>Want to Play</option>
                    <option value='currently_playing'>Currently Playing</option>
                    <option value='completed'>Completed</option>
                    <option value='completed_100'>100% Completed</option>
                    <option value='on_hold'>On Hold</option>
                    <option value='dropped'>Dropped</option>
                  </select>
                  <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                    <span className='material-symbols-outlined text-text-secondary text-[20px]'>
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-text-secondary mb-2'>
                  Release Date
                </label>
                <div className='px-4 py-2.5 bg-background-dark/50 border border-white/5 rounded-xl text-white opacity-80'>
                  {new Date(game.game?.release_date || '').toLocaleDateString()}
                </div>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-text-secondary mb-2'>
                Personal Notes
              </label>
              <textarea
                rows={4}
                className='block w-full px-4 py-3 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm resize-none'
                placeholder='Add any personal notes or thoughts about the game...'
                value={formData.user_notes}
                onChange={e =>
                  setFormData(prev => ({ ...prev, user_notes: e.target.value }))
                }
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className='p-6 border-t border-white/5 bg-background-dark/50 flex items-center justify-between'>
          <button
            type='button'
            onClick={onDelete}
            className='px-5 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-medium transition-colors'
          >
            Delete
          </button>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={onCancel}
              className='px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              form='edit-game-form'
              className='px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background-dark font-bold shadow-lg shadow-primary/20 transition-all'
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGameModal;
