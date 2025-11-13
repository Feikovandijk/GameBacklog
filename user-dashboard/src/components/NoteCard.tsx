import React, { useState } from 'react';
import { Card, Typography, Space, Button, Dropdown, Tag, Modal } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { GameNote } from '../services/api';

const { Text, Paragraph } = Typography;

interface NoteCardProps {
  note: GameNote;
  onEdit: (note: GameNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string, isPinned: boolean) => void;
}

const NOTE_COLORS = {
  default: 'var(--card-bg)',
  yellow: '#fff9c4',
  orange: '#ffd8a8', 
  red: '#f8bab8',
  purple: '#d7c6e6',
  blue: '#aecbfa',
  green: '#c4e7c1',
  gray: '#e8eaed',
};

const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  onEdit, 
  onDelete, 
  onTogglePin 
}) => {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const handleDeleteClick = () => {
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(note.$id);
    setIsDeleteModalVisible(false);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit note',
      icon: <EditOutlined />,
      onClick: () => onEdit(note),
    },
    {
      key: 'pin',
      label: note.is_pinned ? 'Unpin note' : 'Pin note',
      icon: note.is_pinned ? <PushpinOutlined /> : <PushpinFilled />,
      onClick: () => onTogglePin(note.$id, note.is_pinned),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete note',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDeleteClick,
    },
  ];

  const backgroundColor = note.color && NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] 
    ? NOTE_COLORS[note.color as keyof typeof NOTE_COLORS]
    : NOTE_COLORS.default;

  return (
    <>
      <Card
        hoverable
        style={{
          background: backgroundColor,
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          height: 'auto',
          minHeight: '200px',
          position: 'relative',
        }}
        bodyStyle={{ 
          padding: '16px',
          paddingBottom: '40px', // Space for actions
        }}
        onMouseEnter={(e) => {
          const actionsDiv = e.currentTarget.querySelector('.note-actions') as HTMLElement;
          if (actionsDiv) actionsDiv.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const actionsDiv = e.currentTarget.querySelector('.note-actions') as HTMLElement;
          if (actionsDiv) actionsDiv.style.opacity = '0';
        }}
        onClick={() => onEdit(note)}
      >
        {/* Pin indicator */}
        {note.is_pinned && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            zIndex: 2,
          }}>
            <PushpinFilled />
          </div>
        )}

        {/* Note content */}
        <div style={{ paddingRight: note.is_pinned ? '24px' : '0' }}>
          {/* Title */}
          {note.title && (
            <Text 
              strong 
              style={{ 
                fontSize: '16px',
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-primary)',
                lineHeight: '1.4',
              }}
              ellipsis
            >
              {note.title}
            </Text>
          )}

          {/* Content */}
          <Paragraph
            style={{
              marginBottom: '12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
            ellipsis={{ rows: 6 }}
          >
            {note.content}
          </Paragraph>

          {/* Game link */}
          {note.game && (
            <div style={{ marginBottom: '8px' }}>
              <Tag 
                icon={<PlayCircleOutlined />}
                color="blue"
                style={{ margin: 0 }}
              >
                {note.game.name}
              </Tag>
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <Space size={[4, 4]} wrap>
                {note.tags.slice(0, 3).map(tag => (
                  <Tag key={tag} style={{ fontSize: '12px' }}>
                    {tag}
                  </Tag>
                ))}
                {note.tags.length > 3 && (
                  <Tag style={{ fontSize: '12px' }}>
                    +{note.tags.length - 3}
                  </Tag>
                )}
              </Space>
            </div>
          )}

          {/* Timestamp */}
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '12px',
              display: 'block',
              marginTop: '8px',
            }}
          >
            {new Date(note.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: new Date(note.updated_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            })}
          </Text>
        </div>

        {/* Actions (shown on hover) */}
        <div 
          className="note-actions"
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            opacity: '0',
            transition: 'opacity 0.2s ease',
            zIndex: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Dropdown 
            menu={{ items: menuItems }} 
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid var(--border-color)',
              }}
            />
          </Dropdown>
        </div>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        title="Delete Note"
        open={isDeleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete this note? This action cannot be undone.</p>
        {note.title && (
          <div style={{ 
            background: 'var(--card-bg)', 
            padding: '12px', 
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginTop: '12px'
          }}>
            <Text strong>{note.title}</Text>
            {note.content && (
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" ellipsis>
                  {note.content.substring(0, 100)}
                  {note.content.length > 100 ? '...' : ''}
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default NoteCard;