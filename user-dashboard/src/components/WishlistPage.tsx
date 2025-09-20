import React, { useState, useEffect } from 'react';
import type { WishlistItem } from '../../../api/src/services/steam-wishlist-service';
import { api } from '../services/api';
import WishlistGameCard from './WishlistGameCard';

const WishlistPage: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await api.getWishlist();
        setWishlist(response.data);
      } catch (err) {
        setError('Failed to fetch wishlist. Please try again later.');
      }
      setLoading(false);
    };

    fetchWishlist();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Steam Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wishlist.map((item, index) => (
          <WishlistGameCard key={index} item={item} />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
