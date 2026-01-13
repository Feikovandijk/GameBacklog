import React from 'react';
import { motion } from 'framer-motion';
import type { User } from '../../services/api';

interface WelcomeHeaderProps {
    user: User | null;
    inProgressCount?: number;
    completedThisMonth?: number;
}

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
};

const getMotivationalMessage = (
    inProgress: number,
    completedThisMonth: number
): string => {
    if (completedThisMonth >= 3) {
        return `Great month! You've completed ${completedThisMonth} games 🎉`;
    }
    if (inProgress > 5) {
        return `You have ${inProgress} games in progress - time to focus! 🎯`;
    }
    if (inProgress > 0) {
        return `${inProgress} ${inProgress === 1 ? 'game' : 'games'} waiting for you`;
    }
    return "Ready to start a new adventure?";
};

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
    user,
    inProgressCount = 0,
    completedThisMonth = 0,
}) => {
    const greeting = getGreeting();
    const motivationalMessage = getMotivationalMessage(
        inProgressCount,
        completedThisMonth
    );

    return (
        <motion.div
            className="welcome-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.img
                src={user?.avatar_url || 'https://via.placeholder.com/72'}
                alt={user?.display_name || 'User'}
                className="welcome-avatar"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            />
            <div className="welcome-text">
                <h1>
                    {greeting}, {user?.display_name || 'Gamer'}!
                </h1>
                <p>{motivationalMessage}</p>
            </div>
        </motion.div>
    );
};

export default WelcomeHeader;
