import { apiFetch } from './client';

type SaveVerseInput = {
  date: string;
  referenceText: string;
  note?: string;
};

type Verse = {
  id: number;
  date: string;
  reference_text: string;
  note: string | null;
  created_at: string;
};

export async function saveVerse(input: SaveVerseInput): Promise<Verse> {
  const data = await apiFetch<{ verse: Verse }>('/verses', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return data.verse;
}
