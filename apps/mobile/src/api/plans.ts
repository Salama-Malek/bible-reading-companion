import { apiFetch } from './client';

export type TodayPlan = {
  id: number;
  date: string;
  testament: string;
  book: string;
  chapter: number;
  created_at: string;
};

export async function getTodayPlan(): Promise<TodayPlan | null> {
  const data = await apiFetch<{ plan: TodayPlan | null }>('/plans/today', {
    method: 'GET',
  });

  return data.plan;
}
