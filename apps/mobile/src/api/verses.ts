import { apiFetch } from './client';

type SaveVerseInput = {
  date: string;
  referenceText: string;
  note?: string;
};

type VerseApiItem = {
  id: number;
  date: string | null;
  reference_text: string;
  note: string | null;
  created_at: string;
};

export type SavedVerse = {
  id: number;
  date: string | null;
  referenceText: string;
  note: string | null;
  createdAt: string;
};

export type ListSavedVersesParams = {
  page: number;
  pageSize: number;
};

export type ListSavedVersesResponse = {
  items: SavedVerse[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

function mapVerse(item: VerseApiItem): SavedVerse {
  return {
    id: item.id,
    date: item.date,
    referenceText: item.reference_text,
    note: item.note,
    createdAt: item.created_at,
  };
}

export async function saveVerse(input: SaveVerseInput): Promise<SavedVerse> {
  const data = await apiFetch<{ verse: VerseApiItem }>('/verses', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return mapVerse(data.verse);
}

export async function listSavedVerses(params: ListSavedVersesParams): Promise<ListSavedVersesResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  const data = await apiFetch<{ items: VerseApiItem[]; page: number; pageSize: number; total: number }>(
    `/verses?${query.toString()}`,
    {
      method: 'GET',
    },
  );

  return {
    items: data.items.map(mapVerse),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    hasMore: data.page * data.pageSize < data.total,
  };
}

export async function deleteSavedVerse(id: number): Promise<void> {
  await apiFetch<{ deleted: true }>(`/verses/${id}`, {
    method: 'DELETE',
  });
}
