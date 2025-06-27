import React from 'react';
import { Modal, Form, Input, Select, Row, Col, Typography, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UserGame } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface EditGameModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  game: UserGame | null;
}

const EditGameModal: React.FC<EditGameModalProps> = ({ visible, onCancel, onOk, game }) => {
  const [form] = Form.useForm();

  // Set form values when game changes or when the modal is opened
  React.useEffect(() => {
    if (visible && game) {
      form.setFieldsValue({
        status: game.status,
        user_notes: game.user_notes,
      });
    } else if (!visible) {
        form.resetFields();
    }
  }, [game, visible, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onOk(values);
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  if (!game) {
    return null; // Keep this to prevent rendering without a game context
  }

  return (
    <Modal
      title={<Title level={3}>Edit Game</Title>}
      visible={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Save Changes"
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ remember: true }}>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Game Title">
              <Input value={game.game?.name} disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Genre">
                <Input value={game.game?.genres.join(', ')} disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
            <Col span={12}>
                <Form.Item label="Platform">
                <Input value={game.game?.publishers.join(', ')} disabled />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select placeholder="Select a status">
                    <Option value="want_to_play">Want to Play</Option>
                    <Option value="currently_playing">Currently Playing</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="completed_100">100% Completed</Option>
                    <Option value="on_hold">On Hold</Option>
                    <Option value="dropped">Dropped</Option>
                </Select>
                </Form.Item>
            </Col>
        </Row>

        <Form.Item name="user_notes" label="Personal Notes">
          <Input.TextArea rows={4} placeholder="Add any personal notes or thoughts about the game..." />
        </Form.Item>

        <Row gutter={24}>
            <Col span={12}>
                <Form.Item label="Release Date">
                    <Input value={new Date(game.game?.release_date || '').toLocaleDateString()} disabled />
                </Form.Item>
            </Col>
             <Col span={12}>
                <Form.Item label="Game Cover">
                    <img src={game.game?.header_image} alt={game.game?.name} style={{ width: '100%', borderRadius: '8px' }}/>
                </Form.Item>
            </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditGameModal; 