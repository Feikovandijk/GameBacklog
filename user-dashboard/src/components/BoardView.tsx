import React from 'react';
import { Row, Col, Typography, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import GameCard from './GameCard'; // We'll create this next
import type { UserGame } from '../services/api';

const { Title } = Typography;

const statusColumns = [
    { title: 'Not Ready', key: 'not_ready' },
    { title: 'To Do', key: 'want_to_play' },
    { title: 'In Progress', key: 'currently_playing' },
    { title: 'Completed', key: 'completed' },
];

interface BoardViewProps {
    games: UserGame[];
    onUpdateStatus: (gameId: string, status: string) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ games, onUpdateStatus }) => {
  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>Board</Title>
          <div>
              {/* Add filter/sort controls here later */}
          </div>
      </Row>
      <Row gutter={16}>
        {statusColumns.map(col => (
          <Col span={6} key={col.key}>
            <div style={{ 
              background: '#F7F8FA', 
              padding: '16px', 
              borderRadius: '8px',
              height: '100%'
            }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                <Title level={5} style={{ margin: 0, textTransform: 'uppercase', color: '#6B778C' }}>{col.title}</Title>
                <Button type="text" icon={<MoreOutlined />} />
              </Row>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {games
                  .filter(g => g.status === col.key)
                  .map(game => (
                    <GameCard key={game.$id} game={game} />
                  ))
                }
                {/* Placeholder for adding a new task */}
                <Button type="dashed" style={{ marginTop: '16px' }}>+ Add task</Button>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default BoardView;
