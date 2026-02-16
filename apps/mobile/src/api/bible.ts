import { apiFetch } from './client';

type ChapterVerseApiItem = {
  verse?: number;
  verse_number?: number;
  number?: number;
  text?: string;
  verse_text?: string;
  content?: string;
};

export type BibleVerse = {
  verse: number;
  text: string;
};

function toBibleVerse(item: ChapterVerseApiItem): BibleVerse {
  const verseNumber = item.verse ?? item.verse_number ?? item.number;
  const text = item.text ?? item.verse_text ?? item.content;

  if (typeof verseNumber !== 'number' || typeof text !== 'string') {
    throw new Error('Bible API returned an unexpected verse format.');
  }

  return {
    verse: verseNumber,
    text,
  };
}

export async function getBibleChapter(book: string, chapter: string): Promise<BibleVerse[]> {
  const encodedBook = encodeURIComponent(book.trim());
  const encodedChapter = encodeURIComponent(chapter.trim());

  const data = await apiFetch<{ verses: ChapterVerseApiItem[] }>(
    `/bible/${encodedBook}/chapter/${encodedChapter}`,
    {
      method: 'GET',
    },
  );

  if (!Array.isArray(data.verses)) {
    throw new Error('Bible API returned an unexpected chapter payload.');
  }

  return data.verses.map(toBibleVerse);
}
