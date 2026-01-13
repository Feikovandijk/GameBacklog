import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    PlusOutlined,
    SyncOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import api from '../../services/api';

interface QuickActionsProps {
    onSyncComplete?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onSyncComplete }) => {
    const navigate = useNavigate();
    const [syncing, setSyncing] = React.useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/api/user/sync');
            message.success('Steam sync started! Your library will update shortly.');
            setTimeout(() => {
                onSyncComplete?.();
            }, 3000);
        } catch (error) {
            console.error('Sync error:', error);
            message.error('Failed to start sync. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    const actions = [
        {
            icon: <PlusOutlined />,
            label: 'Add Game',
            onClick: () => navigate('/add-game'),
            color: 'linear-gradient(135deg, #7B61FF, #5DADE2)',
        },
        {
            icon: <SyncOutlined spin={syncing} />,
            label: syncing ? 'Syncing...' : 'Sync Library',
            onClick: handleSync,
            color: 'linear-gradient(135deg, #4ECB71, #5DADE2)',
            disabled: syncing,
        },
        {
            icon: <ThunderboltOutlined />,
            label: 'Random Pick',
            onClick: () => {
                message.info('Random pick feature coming soon!');
            },
            color: 'linear-gradient(135deg, #FFB347, #FF6B9C)',
        },
    ];

    return (
        <div className="quick-actions">
            {actions.map((action, index) => (
                <motion.button
                    key={action.label}
                    className="quick-action-btn"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        opacity: action.disabled ? 0.6 : 1,
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                    }}
                >
                    <span className="icon">{action.icon}</span>
                    {action.label}
                </motion.button>
            ))}
        </div>
    );
};

export default QuickActions;
