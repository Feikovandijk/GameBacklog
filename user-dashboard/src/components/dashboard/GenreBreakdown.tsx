import React from 'react';
import { motion } from 'framer-motion';
import { Pie } from '@ant-design/plots';

interface GenreBreakdownProps {
    genres: { name: string; count: number }[];
    loading?: boolean;
}

const COLORS = [
    '#7B61FF',
    '#5DADE2',
    '#4ECB71',
    '#FFB347',
    '#FF6B9C',
    '#00D9FF',
];

const GenreBreakdown: React.FC<GenreBreakdownProps> = ({ genres, loading }) => {
    if (loading) {
        return (
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <span className="icon">🎮</span>
                        Your Genres
                    </h3>
                </div>
                <div className="genre-breakdown">
                    <div
                        className="skeleton"
                        style={{ width: 180, height: 180, borderRadius: '50%' }}
                    />
                    <div className="genre-legend">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="genre-legend-item">
                                <div className="skeleton" style={{ width: 12, height: 12 }} />
                                <div
                                    className="skeleton"
                                    style={{ flex: 1, height: 14, marginLeft: 8 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    if (!genres || genres.length === 0) {
        return (
            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">
                        <span className="icon">🎮</span>
                        Your Genres
                    </h3>
                </div>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-muted)',
                    }}
                >
                    Add some games to see your genre breakdown
                </div>
            </motion.div>
        );
    }

    const chartData = genres.map((g, i) => ({
        type: g.name,
        value: g.count,
        color: COLORS[i % COLORS.length],
    }));

    const config = {
        data: chartData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.9,
        innerRadius: 0.65,
        label: false,
        legend: false,
        color: COLORS,
        statistic: {
            title: false,
            content: false,
        },
        interactions: [{ type: 'element-active' }],
    };

    return (
        <motion.div
            className="dashboard-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
        >
            <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                    <span className="icon">🎮</span>
                    Your Genres
                </h3>
            </div>
            <div className="genre-breakdown">
                <div className="genre-chart-container">
                    <Pie {...config} />
                </div>
                <div className="genre-legend">
                    {genres.slice(0, 5).map((genre, index) => (
                        <div key={genre.name} className="genre-legend-item">
                            <div
                                className="genre-legend-color"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="genre-legend-name">{genre.name}</span>
                            <span className="genre-legend-count">
                                {genre.count} {genre.count === 1 ? 'game' : 'games'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default GenreBreakdown;
