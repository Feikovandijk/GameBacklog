import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  title: string;
  children: React.ReactElement;
  className?: string;
  height?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = '',
  height = 300,
}) => (
  <div className={`chart-card ${className}`}>
    <h3>{title}</h3>
    <ResponsiveContainer width='100%' height={height}>
      {children}
    </ResponsiveContainer>
  </div>
);

export default ChartCard;
