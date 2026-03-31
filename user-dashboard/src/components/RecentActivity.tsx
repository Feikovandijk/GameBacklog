import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Spin } from 'antd';
import {
  CheckCircleOutlined,
  PlusCircleOutlined,
  FormOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { userGamesAPI } from '../services/api';
import type { UserActivity } from '../services/api';
import moment from 'moment';

const { Text } = Typography;

const iconMap: { [key: string]: React.ReactNode } = {
  'game.completed': <CheckCircleOutlined style={{ color: 'green' }} />,
  'game.added': <PlusCircleOutlined style={{ color: 'blue' }} />,
  'game.started': <PlayCircleOutlined style={{ color: 'purple' }} />,
  'game.note_added': <FormOutlined style={{ color: 'orange' }} />,
};

const textMap: { [key: string]: (metadata: { gameName?: string }) => string } =
  {
    'game.completed': metadata => `Completed "${metadata.gameName}"`,
    'game.added': metadata => `Added "${metadata.gameName}" to backlog`,
    'game.started': metadata => `Started "${metadata.gameName}"`,
    'game.note_added': metadata => `Added note to "${metadata.gameName}"`,
  };

const RecentActivity = () => {
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await userGamesAPI.getActivity();
        setActivity(response.data);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <Card title='Recent Activity'>
        <Spin />
      </Card>
    );
  }

  return (
    <Card title='Recent Activity'>
      <List
        itemLayout='horizontal'
        dataSource={activity}
        renderItem={(item: UserActivity) => {
          const metadata = JSON.parse(item.metadata_json);
          return (
            <List.Item>
              <List.Item.Meta
                avatar={iconMap[item.type] || <CheckCircleOutlined />}
                title={
                  <Text>
                    {textMap[item.type]
                      ? textMap[item.type](metadata)
                      : 'Unknown activity'}
                  </Text>
                }
                description={
                  <Text type='secondary'>
                    {moment(item.timestamp).fromNow()}
                  </Text>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default RecentActivity;
