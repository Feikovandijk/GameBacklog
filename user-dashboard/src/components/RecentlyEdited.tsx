import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Avatar, Tag } from 'antd';
import {
  EditOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { userGamesAPI } from '../services/api';
import type { UserGame } from '../services/api';
import moment from 'moment';

const { Text } = Typography;

interface EditedItem {
  id: string;
  type: 'game' | 'note';
  game: UserGame;
  lastEdited: string;
  editType: string; // 'status_change', 'note_added', 'rating_updated', etc.
}

const RecentlyEdited: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [recentlyEdited, setRecentlyEdited] = useState<EditedItem[]>([]);

  useEffect(() => {
    const fetchRecentlyEdited = async () => {
      setLoading(true);
      try {
        // For now, we'll fetch recently updated games
        // In a real implementation, you'd have an API endpoint for recently edited items
        const response = await userGamesAPI.get({
          limit: 3, // Reduced from 5 to 3
        });
        
        // Transform the data to match our interface
        const editedItems: EditedItem[] = response.data.documents.map((game: UserGame, index: number) => ({
          id: game.$id,
          type: 'game' as const,
          game,
          lastEdited: game.updated_at || game.added_at,
          editType: index % 3 === 0 ? 'status_change' : index % 3 === 1 ? 'note_added' : 'rating_updated',
        }));
        
        setRecentlyEdited(editedItems);
      } catch (error) {
        console.error('Error fetching recently edited:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyEdited();
  }, []);

  const getEditIcon = (editType: string) => {
    switch (editType) {
      case 'note_added':
        return <FileTextOutlined style={{ color: 'var(--accent-blue)' }} />;
      case 'status_change':
        return <EditOutlined style={{ color: 'var(--text-secondary)' }} />;
      case 'rating_updated':
        return <EditOutlined style={{ color: 'var(--accent-blue)' }} />;
      default:
        return <EditOutlined style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const getEditDescription = (editType: string) => {
    switch (editType) {
      case 'note_added':
        return 'Added note';
      case 'status_change':
        return 'Status updated';
      case 'rating_updated':
        return 'Rating updated';
      default:
        return 'Game updated';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#52c41a';
      case 'currently_playing':
        return 'var(--accent-blue)';
      case 'want_to_play':
        return '#faad14';
      case 'dropped':
        return '#ff4d4f';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <EditOutlined style={{ color: '#ffffff', fontSize: '20px' }} />
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>
              Recently Edited
            </span>
          </div>
        }
        style={{ 
          height: '500px', // Increased from 400px
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
        }}
        bodyStyle={{ padding: '24px' }}
        headStyle={{ borderBottom: 'none' }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px' // Adjusted for the taller card
        }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (recentlyEdited.length === 0) {
    return (
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <EditOutlined style={{ color: '#ffffff', fontSize: '20px' }} />
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>
              Recently Edited
            </span>
          </div>
        }
        style={{ 
          height: '500px', // Increased from 400px
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
        }}
        bodyStyle={{ padding: '24px' }}
        headStyle={{ borderBottom: 'none' }}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 20px', // Increased padding for taller card
          background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          borderRadius: '12px',
          border: '1px dashed rgba(96, 165, 250, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '100px',
            height: '100px',
            background: 'rgba(96, 165, 250, 0.05)',
            borderRadius: '50%',
          }} />
          <EditOutlined style={{ 
            fontSize: '64px', 
            marginBottom: '20px',
            color: 'var(--accent-blue)',
            opacity: 0.8,
          }} />
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}>
            No recent edits
          </div>
          <Text 
            type='secondary' 
            style={{ 
              fontSize: '14px',
              display: 'block',
              marginBottom: '20px',
            }}
          >
            Your recent game edits will appear here
          </Text>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(96, 165, 250, 0.1)',
            borderRadius: '20px',
            display: 'inline-block',
            fontSize: '12px',
            color: 'var(--accent-blue)',
            fontWeight: '500',
          }}>
            📝 Edit games, add notes, or update ratings to see activity
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <EditOutlined style={{ color: '#ffffff', fontSize: '20px' }} />
          </div>
          <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>
            Recently Edited
          </span>
        </div>
      }
      style={{ 
        height: '500px', // Increased from 400px
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
      }}
      bodyStyle={{ padding: '16px', height: 'calc(100% - 73px)', overflow: 'hidden' }}
      headStyle={{ borderBottom: 'none' }}
    >
      <List
        itemLayout="horizontal"
        dataSource={recentlyEdited}
        renderItem={(item) => (
          <List.Item style={{ 
            borderRadius: '12px',
            marginBottom: '16px', // Increased margin
            background: 'rgba(96, 165, 250, 0.02)',
            padding: '20px', // Increased padding
            border: 'none',
          }}>
            <List.Item.Meta
              avatar={
                <div style={{ position: 'relative' }}>
                  <Avatar
                    src={item.game.game?.header_image}
                    shape="square"
                    size={56}
                    style={{ borderRadius: '12px', border: '2px solid var(--border-color)' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    background: 'var(--accent-blue)',
                    borderRadius: '50%',
                    padding: '4px',
                    border: '2px solid var(--card-bg)',
                    minWidth: '24px',
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getEditIcon(item.editType)}
                  </div>
                </div>
              }
              title={
                <div>
                  <Text 
                    ellipsis={{ tooltip: item.game.game?.name }} 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {item.game.game?.name || 'Unknown Game'}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Tag 
                      color={getStatusColor(item.game.status)}
                      style={{ fontSize: '11px', marginRight: '8px' }}
                    >
                      {item.game.status.replace('_', ' ').toUpperCase()}
                    </Tag>
                  </div>
                </div>
              }
              description={
                <div>
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '12px', display: 'block' }}
                  >
                    {getEditDescription(item.editType)}
                  </Text>
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ClockCircleOutlined />
                    {moment(item.lastEdited).fromNow()}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default RecentlyEdited;