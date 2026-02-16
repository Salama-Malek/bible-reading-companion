import { getTodayAsEuropeRigaYYYYMMDD } from '@/src/utils/europeRigaDate';

import { apiFetch } from './client';

export type ReadingMethod = 'physical' | 'digital';

type ReadingRecord = {
  id: number;
  user_id: number;
  plan_id: number;
  method: ReadingMethod;
  completed_at: string;
  date?: string;
};

type ReadingPlan = {
  id: number;
  date: string;
  testament: string;
  book: string;
  chapter: number;
  created_at: string;
};

export type ReadingHistorySummary = {
  completedCount: number;
  missedCount: number;
  currentStreak: number;
  longestStreak: number;
};

export type ReadingHistoryResponse = {
  plans: ReadingPlan[];
  records: ReadingRecord[];
  missedDates: string[];
  summary: ReadingHistorySummary;
};

type CompletionInput = {
  date: string;
  method: ReadingMethod;
};

export function getLocalDateString(): string {
  return getTodayAsEuropeRigaYYYYMMDD();
}

export async function completeReadingForDate(input: CompletionInput): Promise<ReadingRecord> {
  const data = await apiFetch<{ record: ReadingRecord }>('/reading/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return data.record;
}

export async function getTodayCompletionState(today: string = getLocalDateString()): Promise<boolean> {
  const data = await apiFetch<{ records: ReadingRecord[] }>(`/reading/history?from=${today}&to=${today}`, {
    method: 'GET',
  });

  return data.records.length > 0;
}

export async function getReadingHistory(from: string, to: string): Promise<ReadingHistoryResponse> {
  const query = new URLSearchParams({ from, to });

  return apiFetch<ReadingHistoryResponse>(`/reading/history?${query.toString()}`, {
    method: 'GET',
  });
}
