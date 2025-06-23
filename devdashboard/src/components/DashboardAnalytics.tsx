import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line
} from 'recharts';
import ChartCard from './ChartCard';

interface AnalyticsData {
  releaseYearDistribution: Record<string, number>;
  genreDistribution: { name: string; count: number }[];
}

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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: AnalyticsData = await response.json();
        setAnalytics(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError('An unknown error occurred while fetching analytics.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const releaseYearData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.releaseYearDistribution)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [analytics]);
  
  const renderLegend = (value: string) => <span style={{ color: 'white' }}>{value}</span>;

  if (loading) return <div className="analytics-container"><p>Loading analytics...</p></div>;
  if (error) return <div className="analytics-container"><p className="error-message">Error: {error}</p></div>;
  if (!analytics) return <div className="analytics-container"><p>No analytics data available.</p></div>;

  return (
    <div className="analytics-container">
      <ChartCard title="Top 10 Genres">
        <BarChart data={analytics.genreDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" stroke="#fff" />
            <YAxis type="category" dataKey="name" stroke="#fff" />
            <Tooltip />
            <Legend formatter={renderLegend}/>
            <Bar dataKey="count" fill="#82ca9d" />
        </BarChart>
      </ChartCard>

      <ChartCard title="Game Releases by Year" className="grid-span-2" height={400}>
        <LineChart data={releaseYearData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip />
            <Legend formatter={renderLegend}/>
            <Line type="monotone" dataKey="count" stroke="#8884d8" />
        </LineChart>
      </ChartCard>
    </div>
  );
};

export default DashboardAnalytics; 