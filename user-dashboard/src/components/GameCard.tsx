import React from 'react';
import { Card, Avatar, Tag, Dropdown } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { UserGame } from '../services/api';

interface GameCardProps {
    game: UserGame;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  return (
    <Card
      hoverable
      style={{ background: '#fff' }}
      bodyStyle={{ padding: '16px' }}
      actions={[
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <a onClick={(e) => e.preventDefault()}>
            <MoreOutlined key="ellipsis" />
          </a>
        </Dropdown>,
      ]}
    >
      <Card.Meta
        avatar={game.game?.header_image && <Avatar shape="square" size={64} src={game.game.header_image} />}
        title={game.game?.name || 'Unknown Game'}
        description={`Played for ${game.hours_played} hours`}
      />
      <div style={{ marginTop: '16px' }}>
        <Tag color="blue">RPG</Tag>
        <Tag color="green">Strategy</Tag>
      </div>
    </Card>
  );
};

export default GameCard;
