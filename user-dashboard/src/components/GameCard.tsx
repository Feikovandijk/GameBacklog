import React from 'react';
import { Card, Avatar, Tag, Typography } from 'antd';
import type { UserGame } from '../services/api';

const { Text } = Typography;

interface GameCardProps {
    game: UserGame;
    onTitleClick?: (game: UserGame) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onTitleClick }) => {

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTitleClick?.(game);
  };

  return (
    <Card
      hoverable
      style={{ background: '#fff' }}
      styles={{ body: { padding: '16px' } }}
    >
      <Card.Meta
        avatar={game.game?.header_image && <Avatar shape="square" size={48} src={game.game.header_image} />}
        title={
          <div onPointerDown={handleTitleClick} style={{ cursor: 'pointer' }}>
            <Text ellipsis={{ tooltip: game.game?.name }}>{game.game?.name || 'Unknown Game'}</Text>
          </div>
        }
        description={<Text type="secondary" style={{ fontSize: '12px' }}>{`Played for ${Math.floor(game.hours_played)} hours`}</Text>}
      />
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {game.game?.genres?.slice(0, 2).map((genre) => (
            <Tag key={genre}>{genre}</Tag>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default GameCard;
