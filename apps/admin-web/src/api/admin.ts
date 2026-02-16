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

export type AdminPlanTestament = 'old' | 'new';

export type AdminPlan = {
  id: number;
  date: string;
  testament: AdminPlanTestament;
  book: string;
  chapter: number;
};

export type UpsertAdminPlanInput = {
  date: string;
  testament: AdminPlanTestament;
  book: string;
  chapter: number;
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

export async function plans(from: string, to: string): Promise<AdminPlan[]> {
  const query = new URLSearchParams({ from, to });

  return apiFetch<AdminPlan[]>(`/admin/plans?${query.toString()}`, {
    method: 'GET',
  });
}

export async function createPlan(input: UpsertAdminPlanInput): Promise<AdminPlan> {
  return apiFetch<AdminPlan>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updatePlan(id: number, input: UpsertAdminPlanInput): Promise<AdminPlan> {
  return apiFetch<AdminPlan>(`/admin/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deletePlan(id: number): Promise<void> {
  await apiFetch<null>(`/admin/plans/${id}`, {
    method: 'DELETE',
  });
}
