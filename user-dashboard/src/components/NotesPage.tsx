import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Typography, 
  Space, 
  Row, 
  Col, 
  message,
  Spin,
  FloatButton,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import { notesAPI } from '../services/api';
import type { GameNote } from '../services/api';
import NoteCard from './NoteCard.tsx';
import CreateNoteModal from './CreateNoteModal.tsx';

const { Title, Text } = Typography;
const { Search } = Input;

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<GameNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<GameNote | null>(null);

  // Fetch notes from API
  const fetchNotes = async (search?: string, tags?: string[]) => {
    setLoading(true);
    try {
      const response = await notesAPI.getNotes({
        search,
        tags,
        limit: 100, // Get all notes for now
      });
      setNotes(response.data.documents);
    } catch (error) {
      console.error('Error fetching notes:', error);
      message.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchNotes(value, selectedTags);
  };

  // Handle note creation
  const handleCreateNote = async (noteData: {
    title: string;
    content: string;
    color?: string;
    tags?: string[];
  }) => {
    try {
      await notesAPI.createNote({
        ...noteData,
        is_pinned: false,
      });
      message.success('Note created successfully!');
      setIsCreateModalVisible(false);
      fetchNotes(searchTerm, selectedTags); // Refresh notes
    } catch (error) {
      console.error('Error creating note:', error);
      message.error('Failed to create note');
    }
  };

  // Handle note update
  const handleUpdateNote = async (noteId: string, updateData: Partial<GameNote>) => {
    try {
      await notesAPI.updateNote(noteId, updateData);
      message.success('Note updated successfully!');
      setEditingNote(null);
      fetchNotes(searchTerm, selectedTags); // Refresh notes
    } catch (error) {
      console.error('Error updating note:', error);
      message.error('Failed to update note');
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesAPI.deleteNote(noteId);
      message.success('Note deleted successfully!');
      fetchNotes(searchTerm, selectedTags); // Refresh notes
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Failed to delete note');
    }
  };

  // Handle pin/unpin
  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    await handleUpdateNote(noteId, { is_pinned: !isPinned });
  };

  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  // Separate pinned and unpinned notes
  const pinnedNotes = notes.filter(note => note.is_pinned);
  const unpinnedNotes = notes.filter(note => !note.is_pinned);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '32px', 
      background: 'var(--primary-bg)',
      minHeight: 'calc(100vh - 80px)',
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        <Title 
          level={1} 
          style={{ 
            marginBottom: '8px', 
            color: 'var(--text-primary)',
            fontSize: '36px',
            fontWeight: '700',
          }}
        >
          Game Development Notes
        </Title>
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '16px',
            display: 'block',
          }}
        >
          Capture insights, analysis, and ideas from your game research
        </Text>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Search
              placeholder="Search notes..."
              size="large"
              prefix={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => {
                if (e.target.value === '') {
                  handleSearch('');
                }
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              {allTags.map(tag => (
                <Tag
                  key={tag}
                  color={selectedTags.includes(tag) ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const newSelectedTags = selectedTags.includes(tag)
                      ? selectedTags.filter(t => t !== tag)
                      : [...selectedTags, tag];
                    setSelectedTags(newSelectedTags);
                    fetchNotes(searchTerm, newSelectedTags);
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Quick Create Note */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setIsCreateModalVisible(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'var(--text-secondary)',
            fontSize: '16px'
          }}>
            <PlusOutlined style={{ marginRight: '12px' }} />
            Take a note...
          </div>
        </div>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <PushpinOutlined style={{ 
              color: 'var(--text-secondary)', 
              marginRight: '8px' 
            }} />
            <Text type="secondary" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pinned
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {pinnedNotes.map(note => (
              <Col key={note.$id} xs={24} sm={12} md={8} lg={6}>
                <NoteCard
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Regular Notes */}
      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '16px' 
            }}>
              <Text type="secondary" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Other Notes
              </Text>
            </div>
          )}
          <Row gutter={[16, 16]}>
            {unpinnedNotes.map(note => (
              <Col key={note.$id} xs={24} sm={12} md={8} lg={6}>
                <NoteCard
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Empty State */}
      {notes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 32px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
          <Title level={3} type="secondary">No notes yet</Title>
          <Text type="secondary">
            Start capturing your game development insights and research notes
          </Text>
          <div style={{ marginTop: '24px' }}>
            <Button 
              type="primary" 
              size="large" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Create your first note
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{ right: 24 }}
        onClick={() => setIsCreateModalVisible(true)}
      />

      {/* Create/Edit Note Modal */}
      <CreateNoteModal
        open={isCreateModalVisible || editingNote !== null}
        note={editingNote}
        onCancel={() => {
          setIsCreateModalVisible(false);
          setEditingNote(null);
        }}
        onSave={editingNote ? 
          (data: Partial<GameNote>) => handleUpdateNote(editingNote.$id, data) : 
          handleCreateNote
        }
      />
    </div>
  );
};

export default NotesPage;