import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts';

interface AnalyticsData {
  earlyAccessCount: number;
  releaseYearDistribution: Record<string, number>;
  developerDistribution: { name: string; count: number }[];
  publisherDistribution: { name: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

const DashboardAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/analytics`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: AnalyticsData = await response.json();
        setAnalytics(data);
      } catch (e: any) {
        setError(e.message);
        console.error("Error fetching analytics:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (error) return <p className="error-message">Error loading analytics: {error}</p>;
  if (!analytics) return <p>No analytics data available.</p>;
  
  const releaseYearData = useMemo(() => 
    Object.entries(analytics.releaseYearDistribution)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year)),
    [analytics.releaseYearDistribution]
  );

  return (
    <div className="dashboard-analytics">
        <h2>Database Analytics</h2>
        <div className="analytics-grid">
            <div className="stat-card">
                <h3 className="stat-title">Early Access Titles</h3>
                <p className="stat-value">{analytics.earlyAccessCount}</p>
            </div>
            
            <ChartCard
                title="Top 10 Developers"
                chartType="BarChart"
                data={analytics.developerDistribution}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} stroke="#fff" />
                <YAxis stroke="#fff" />
                <Bar dataKey="count" fill="#8884d8" />
            </ChartCard>

            <div className="chart-card">
                <h3>Top 10 Publishers</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={analytics.publisherDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="count" nameKey="name" label>
                             {analytics.publisherDistribution.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            
            <div className="chart-card full-width">
                <h3>Game Releases by Year</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={releaseYearData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default DashboardAnalytics; 