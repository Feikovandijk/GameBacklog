import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircleOutlined,
    PlusCircleOutlined,
    PlayCircleOutlined,
    FormOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import { userGamesAPI } from '../../services/api';
import moment from 'moment';

interface Activity {
    id: string;
    type: string;
    timestamp?: string;
    created_at?: string;
    metadata_json?: string;
    data?: {
        gameName?: string;
    };
}

const iconMap: Record<string, { icon: React.ReactNode; className: string }> = {
    'game.completed': {
        icon: <CheckCircleOutlined />,
        className: 'completed',
    },
    'game.added': {
        icon: <PlusCircleOutlined />,
        className: 'added',
    },
    'game.started': {
        icon: <PlayCircleOutlined />,
        className: 'started',
    },
    'game.note_added': {
        icon: <FormOutlined />,
        className: 'added',
    },
    'game.updated': {
        icon: <FormOutlined />,
        className: 'added',
    },
};

const textMap: Record<string, (metadata: { gameName?: string }) => string> = {
    'game.completed': m => `Completed "${m.gameName}"`,
    'game.added': m => `Added "${m.gameName}" to backlog`,
    'game.started': m => `Started playing "${m.gameName}"`,
    'game.note_added': m => `Added note to "${m.gameName}"`,
    'game.updated': m => `Updated "${m.gameName}"`,
};

const RecentActivityFeed: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await userGamesAPI.getActivity();
                setActivities(response.data as Activity[]);
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
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <span className="icon">📋</span>
                        Recent Activity
                    </h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            </motion.div>
        );
    }

    if (activities.length === 0) {
        return (
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <span className="icon">📋</span>
                        Recent Activity
                    </h3>
                </div>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-muted)',
                    }}
                >
                    No recent activity yet
                    <br />
                    <span style={{ fontSize: 13 }}>Start playing to see your activity here!</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="dashboard-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
        >
            <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                    <span className="icon">📋</span>
                    Recent Activity
                </h3>
            </div>
            <div className="activity-feed">
                {activities.slice(0, 8).map((activity, index) => {
                    // Handle both old and new data formats
                    let metadata: { gameName?: string } = {};
                    if (activity.metadata_json) {
                        try {
                            metadata = JSON.parse(activity.metadata_json);
                        } catch {
                            metadata = {};
                        }
                    } else if (activity.data) {
                        metadata = activity.data;
                    }

                    const iconInfo = iconMap[activity.type] || {
                        icon: <CheckCircleOutlined />,
                        className: 'completed',
                    };
                    const timestamp = activity.timestamp || activity.created_at;

                    return (
                        <motion.div
                            key={activity.id}
                            className="activity-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * index, duration: 0.3 }}
                        >
                            <div className={`activity-icon ${iconInfo.className}`}>
                                {iconInfo.icon}
                            </div>
                            <div className="activity-content">
                                <div className="activity-text">
                                    {textMap[activity.type]
                                        ? textMap[activity.type](metadata)
                                        : 'Unknown activity'}
                                </div>
                                <div className="activity-time">
                                    {timestamp ? moment(timestamp).fromNow() : 'Recently'}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default RecentActivityFeed;
