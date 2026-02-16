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

type CompletionInput = {
  date: string;
  method: ReadingMethod;
};

export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
