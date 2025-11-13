import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  Tag, 
  AutoComplete,
  Divider,
  Row,
  Col,
  Avatar
} from 'antd';
import { 
  PlusOutlined, 
  PushpinOutlined,
  TagOutlined,
  PictureOutlined
} from '@ant-design/icons';
import type { GameNote, Game } from '../services/api';
import { gamesAPI } from '../services/api';

const { TextArea } = Input;

interface CreateNoteModalProps {
  open: boolean;
  note?: GameNote | null; // For editing existing notes
  onCancel: () => void;
  onSave: (noteData: {
    title: string;
    content: string;
    color?: string;
    tags?: string[];
    game_id?: string;
    is_pinned?: boolean;
  }) => void;
}

const NOTE_COLORS = [
  { value: 'default', label: 'Default', color: 'var(--card-bg)' },
  { value: 'yellow', label: 'Yellow', color: '#fff9c4' },
  { value: 'orange', label: 'Orange', color: '#ffd8a8' },
  { value: 'red', label: 'Red', color: '#f8bab8' },
  { value: 'purple', label: 'Purple', color: '#d7c6e6' },
  { value: 'blue', label: 'Blue', color: '#aecbfa' },
  { value: 'green', label: 'Green', color: '#c4e7c1' },
  { value: 'gray', label: 'Gray', color: '#e8eaed' },
];

const PREDEFINED_TAGS = [
  'UI/UX', 'Gameplay', 'Narrative', 'Audio', 'Art Style', 'Performance',
  'Monetization', 'Tutorial', 'Progression', 'Mechanics', 'Level Design',
  'Character Design', 'Inspiration', 'Analysis', 'Bug', 'Improvement'
];

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  open,
  note,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState<string>('default');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [gameSearchResults, setGameSearchResults] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

  // Initialize form when editing
  useEffect(() => {
    if (open && note) {
      // Editing existing note
      form.setFieldsValue({
        title: note.title,
        content: note.content,
        game_search: note.game?.name || '',
      });
      setSelectedColor(note.color || 'default');
      setTags(note.tags || []);
      setIsPinned(note.is_pinned);
      setSelectedGameId(note.game_id);
    } else if (open) {
      // Creating new note
      form.resetFields();
      setSelectedColor('default');
      setTags([]);
      setTagInput('');
      setIsPinned(false);
      setSelectedGameId(undefined);
      setGameSearchResults([]);
    }
  }, [open, note, form]);

  // Search for games
  const handleGameSearch = async (searchText: string) => {
    if (searchText.length > 2) {
      try {
        const response = await gamesAPI.searchGames(searchText, 10);
        setGameSearchResults(response.data);
      } catch (error) {
        console.error('Error searching games:', error);
        setGameSearchResults([]);
      }
    } else {
      setGameSearchResults([]);
    }
  };

  // Handle game selection
  const handleGameSelect = (_value: string, option: any) => {
    setSelectedGameId(option.key);
  };

  // Add tag
  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields().then(values => {
      const noteData = {
        title: values.title || '',
        content: values.content || '',
        color: selectedColor !== 'default' ? selectedColor : undefined,
        tags: tags,
        game_id: selectedGameId,
        is_pinned: isPinned,
      };
      onSave(noteData);
    });
  };

  const isEditing = !!note;

  return (
    <Modal
      title={isEditing ? 'Edit Note' : 'Create Note'}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {isEditing ? 'Update Note' : 'Create Note'}
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
        {/* Title */}
        <Form.Item name="title" label="Title">
          <Input 
            placeholder="Note title (optional)"
            size="large"
          />
        </Form.Item>

        {/* Content */}
        <Form.Item 
          name="content" 
          label="Content"
          rules={[{ required: true, message: 'Please enter note content' }]}
        >
          <TextArea
            placeholder="What's on your mind about this game?"
            rows={6}
            style={{ fontSize: '14px' }}
          />
        </Form.Item>

        {/* Game Link */}
        <Form.Item name="game_search" label="Link to Game (Optional)">
          <AutoComplete
            placeholder="Search for a game to link..."
            onSearch={handleGameSearch}
            onSelect={handleGameSelect}
            options={gameSearchResults.map(game => ({
              value: game.name,
              key: game.$id,
              label: (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={game.header_image} 
                    alt={game.name}
                    shape="square"
                    size="small"
                    style={{ 
                      width: '32px', 
                      height: '18px', 
                      objectFit: 'cover',
                      borderRadius: '4px',
                      marginRight: '8px'
                    }}
                    icon={<PictureOutlined />}
                  />
                  <span>{game.name}</span>
                </div>
              )
            }))}
            style={{ width: '100%' }}
            size="large"
          />
        </Form.Item>

        <Divider />

        {/* Tags */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--text-primary)',
            fontWeight: '500'
          }}>
            <TagOutlined style={{ marginRight: '4px' }} />
            Tags
          </label>
          
          {/* Current tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <Space size={[4, 4]} wrap>
                {tags.map(tag => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    style={{ marginBottom: '4px' }}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Add tag input */}
          <Row gutter={8}>
            <Col flex={1}>
              <AutoComplete
                value={tagInput}
                onChange={setTagInput}
                onSelect={handleAddTag}
                placeholder="Add tags..."
                options={PREDEFINED_TAGS
                  .filter(tag => !tags.includes(tag) && tag.toLowerCase().includes(tagInput.toLowerCase()))
                  .map(tag => ({ value: tag }))
                }
              />
            </Col>
            <Col>
              <Button 
                icon={<PlusOutlined />} 
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput || tags.includes(tagInput)}
              >
                Add
              </Button>
            </Col>
          </Row>

          {/* Predefined tag suggestions */}
          <div style={{ marginTop: '8px' }}>
            <Space size={[4, 4]} wrap>
              {PREDEFINED_TAGS
                .filter(tag => !tags.includes(tag))
                .slice(0, 8)
                .map(tag => (
                  <Tag
                    key={tag}
                    style={{ 
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      opacity: 0.7
                    }}
                    onClick={() => handleAddTag(tag)}
                  >
                    + {tag}
                  </Tag>
                ))
              }
            </Space>
          </div>
        </div>

        <Divider />

        {/* Color and Pin Options */}
        <Row gutter={16}>
          <Col span={16}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: 'var(--text-primary)',
                fontWeight: '500'
              }}>
                Note Color
              </label>
              <Space wrap>
                {NOTE_COLORS.map(color => (
                  <div
                    key={color.value}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: color.color,
                      border: selectedColor === color.value 
                        ? '3px solid var(--accent-blue)' 
                        : '2px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.label}
                  />
                ))}
              </Space>
            </div>
          </Col>
          <Col span={8}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: 'var(--text-primary)',
                fontWeight: '500'
              }}>
                Options
              </label>
              <Button
                type={isPinned ? 'primary' : 'default'}
                icon={<PushpinOutlined />}
                onClick={() => setIsPinned(!isPinned)}
                style={{ marginBottom: '8px' }}
              >
                {isPinned ? 'Pinned' : 'Pin Note'}
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateNoteModal;