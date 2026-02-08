import { Request, Response } from 'express';
import { supabase } from '../supabase/client';

let analyticsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: statsDocs, error } = await supabase
      .from('statistics')
      .select('key, count');

    if (error) {
      throw error;
    }

    const stats =
      statsDocs?.reduce(
        (acc: Record<string, number>, doc: any) => {
          acc[doc.key] = doc.count;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

    res.json({
      totalGames: stats.totalGames || 0,
      updatedGames: stats.updatedGames || 0,
    });
  } catch (error: unknown) {
    console.error('Error fetching stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch stats', details: errorMessage });
  }
};

export const getAnalytics = async (
  _req: Request,
  res: Response
): Promise<Response | void> => {
  if (analyticsCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    console.log('Serving analytics from cache.');
    return res.json(analyticsCache);
  }

  console.log('Fetching pre-calculated analytics data...');
  try {
    const keysToFetch = [
      'analytics_releaseYearDistribution',
      'analytics_genreDistribution',
    ];

    const { data: statsResponse, error } = await supabase
      .from('statistics')
      .select('key, value')
      .in('key', keysToFetch);

    if (error) {
      throw error;
    }

    const stats =
      statsResponse?.reduce(
        (acc: Record<string, any>, doc: any) => {
          try {
            acc[doc.key] = JSON.parse(doc.value);
          } catch (e) {
            console.error(`Failed to parse stat value for key: ${doc.key}`, e);
            acc[doc.key] = {};
          }
          return acc;
        },
        {} as Record<string, any>
      ) || {};

    const getTopN = (dist: Record<string, number>, n: number) => {
      return Object.entries(dist)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([name, count]) => ({ name, count }));
    };

    const analyticsData = {
      releaseYearDistribution: stats['analytics_releaseYearDistribution'] || {},
      genreDistribution: getTopN(
        stats['analytics_genreDistribution'] || {},
        10
      ),
    };

    analyticsCache = analyticsData;
    cacheTimestamp = Date.now();

    res.json(analyticsData);
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    res
      .status(500)
      .json({ error: 'Failed to fetch analytics', details: errorMessage });
  }
};
