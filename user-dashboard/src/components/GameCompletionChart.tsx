import React from 'react';
import { Pie } from '@ant-design/plots';
import type { UserStats } from '../services/api';

interface GameCompletionChartProps {
  stats: UserStats | null;
}

const GameCompletionChart: React.FC<GameCompletionChartProps> = ({ stats }) => {
  if (!stats) return null;

  const data = [
    { type: 'Completed', value: stats.completedGames },
    { type: 'In Progress', value: stats.currentlyPlaying },
    { type: 'Not Started', value: stats.wantToPlay + stats.onHold },
  ];

  const config = {
    appendPadding: 10,
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: false,
    interactions: [{ type: 'element-selected' }],
    legend: {
        position: 'bottom' as const,
    },
    color: ['#82E0AA', '#5DADE2', '#A569BD'],
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '18px',
        },
        content: `${stats.completedGames + stats.currentlyPlaying + stats.wantToPlay + stats.onHold}\nTotal Games`,
      },
    },
  };

  return <Pie {...config} />;
};

export default GameCompletionChart; 