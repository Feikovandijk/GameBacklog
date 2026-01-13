import React, { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { userGamesAPI, authAPI } from '../services/api';
import type { DashboardStats, User } from '../services/api';
import {
  StatsGrid,
  WelcomeHeader,
  GenreBreakdown,
  QuickActions,
  CurrentlyPlayingGrid,
  RecentActivityFeed,
} from './dashboard';

const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    // Fetch user data first (this should always work if logged in)
    try {
      const userResponse = await authAPI.getCurrentUser();
      setUser(userResponse.data);
    } catch (userError) {
      console.error('Error fetching user:', userError);
    }

    // Fetch stats separately so user data shows even if stats fail
    try {
      const statsResponse = await userGamesAPI.getDashboardStats();
      setStats(statsResponse.data);
    } catch (statsError) {
      console.error('Error fetching dashboard stats:', statsError);
      // Set empty stats so dashboard still renders
      setStats({
        totalGames: 0,
        completedGames: 0,
        completed100: 0,
        currentlyPlaying: 0,
        wantToPlay: 0,
        onHold: 0,
        dropped: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        completedThisYear: 0,
        totalHoursPlayed: 0,
        avgHoursPerCompletion: 0,
        topGenres: [],
        recentAchievementCount: 0,
        collectionValueEstimate: 0,
        completionPercentage: 0,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSyncComplete = () => {
    // Refresh dashboard after sync
    setTimeout(() => {
      fetchDashboardData();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <WelcomeHeader
        user={user}
        inProgressCount={stats?.currentlyPlaying || 0}
        completedThisMonth={stats?.completedThisMonth || 0}
      />

      {/* Quick Actions */}
      <QuickActions onSyncComplete={handleSyncComplete} />

      {/* Stats Grid - 8 cards */}
      <StatsGrid stats={stats} loading={loading} />

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Currently Playing - Left Column */}
        <CurrentlyPlayingGrid />

        {/* Genre Breakdown - Right Column */}
        <GenreBreakdown genres={stats?.topGenres || []} loading={loading} />

        {/* Recent Activity - Left Column */}
        <RecentActivityFeed />

        {/* Completion Stats Card - Right Column */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <span className="icon">📊</span>
              Completion Insights
            </h3>
          </div>
          <div style={{ padding: '16px 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-green)',
                  }}
                >
                  {stats?.completedThisYear || 0}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  Completed this year
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-blue)',
                  }}
                >
                  {stats?.avgHoursPerCompletion || 0}h
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  Avg. hours to complete
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-purple)',
                  }}
                >
                  {stats?.completionPercentage || 0}%
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  Completion rate
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-orange)',
                  }}
                >
                  {stats?.onHold || 0}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  Games on hold
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
