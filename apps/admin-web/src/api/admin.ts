import { apiFetch } from './client';

export type AdminUserStatus = 'active' | 'missing_today' | 'inactive_7d' | 'inactive_14d';

export type AdminAnalyticsToday = {
  completedToday: number;
  totalPopulation: number;
  activeToday: number;
  missingToday: number;
  inactive7d: number;
  inactive14d: number;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  lastCompletedAt?: string | null;
  currentStreak?: number | null;
};

type AnalyticsTodayApiResponse = {
  completionRate?: {
    completed?: number;
    total?: number;
  };
  completedToday?: number;
  totalUsers?: number;
  totalPopulation?: number;
  activeToday?: number;
  missingToday?: number;
  inactive7d?: number;
  inactive14d?: number;
  counts?: {
    activeToday?: number;
    missingToday?: number;
    inactive7d?: number;
    inactive14d?: number;
  };
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeAnalytics(payload: AnalyticsTodayApiResponse): AdminAnalyticsToday {
  const completedToday = toNumber(payload.completedToday ?? payload.completionRate?.completed);
  const totalPopulation = toNumber(payload.totalPopulation ?? payload.totalUsers ?? payload.completionRate?.total);

  return {
    completedToday,
    totalPopulation,
    activeToday: toNumber(payload.activeToday ?? payload.counts?.activeToday),
    missingToday: toNumber(payload.missingToday ?? payload.counts?.missingToday),
    inactive7d: toNumber(payload.inactive7d ?? payload.counts?.inactive7d),
    inactive14d: toNumber(payload.inactive14d ?? payload.counts?.inactive14d),
  };
}

export async function analyticsToday(): Promise<AdminAnalyticsToday> {
  const data = await apiFetch<AnalyticsTodayApiResponse>('/admin/analytics/today', {
    method: 'GET',
  });

  return normalizeAnalytics(data);
}

export async function usersByStatus(status: AdminUserStatus): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>(`/admin/users?status=${encodeURIComponent(status)}`, {
    method: 'GET',
  });
}
