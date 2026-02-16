import { apiFetch } from './client';

export type Announcement = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  created_by: number;
};

export async function getAnnouncements(page = 1, pageSize = 50): Promise<Announcement[]> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const data = await apiFetch<{ announcements: Announcement[] }>(`/announcements?${query.toString()}`, {
    method: 'GET',
  });

  return data.announcements;
}
