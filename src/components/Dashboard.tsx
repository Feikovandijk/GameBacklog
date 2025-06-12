import React from 'react';
import { Game } from '../types/game';

interface DashboardProps {
  games: Game[];
}

export const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <div className="text-center py-8 text-gray-400">
      <p>Dashboard functionality is currently disabled. Check back later for updates!</p>
    </div>
  );
}; 