import React from 'react';
import type { WishlistItem } from '../../../api/src/services/steam-wishlist-service';
import { api } from '../services/api';

interface WishlistGameCardProps {
  item: WishlistItem;
}

const WishlistGameCard: React.FC<WishlistGameCardProps> = ({ item }) => {
  const handleAddGame = async () => {
    try {
      // The steam_appid is the last part of the capsule URL
      const steamAppId = item.capsule.split('/').pop()?.split('.')[0];
      if (steamAppId) {
        await api.addGameToBacklog(steamAppId, 'want_to_play');
        alert(`${item.name} has been added to your backlog!`);
      }
    } catch (error) {
      alert(`Failed to add ${item.name} to your backlog.`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={item.capsule} alt={item.name} className="w-full h-32 object-cover" />
      <div className="p-4">
        <h3 className="font-bold text-lg">{item.name}</h3>
        <button
          onClick={handleAddGame}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add to Backlog
        </button>
      </div>
    </div>
  );
};

export default WishlistGameCard;
