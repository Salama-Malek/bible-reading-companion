import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getAnnouncements, type Announcement } from '@/src/api/announcements';

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAnnouncements();
      setItems(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace('/(tabs)/home');
          }}
        >
          <Text style={styles.refresh}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Announcements</Text>
        <Pressable onPress={() => void loadAnnouncements()}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isLoading && !error && items.length === 0 ? <Text style={styles.empty}>No announcements yet.</Text> : null}

      {!isLoading && !error
        ? items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  refresh: {
    color: '#1f6feb',
    fontWeight: '600',
  },
  centered: {
    paddingVertical: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  date: {
    color: '#6b7280',
    fontSize: 12,
  },
  body: {
    marginTop: 4,
    color: '#111827',
  },
  error: {
    color: '#b91c1c',
  },
  empty: {
    color: '#6b7280',
  },
});
