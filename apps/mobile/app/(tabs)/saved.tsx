import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteSavedVerse, listSavedVerses, SavedVerse } from '@/src/api/verses';

const INITIAL_PAGE = 1;
const PAGE_SIZE = 50;

export default function SavedScreen() {
  const [verses, setVerses] = useState<SavedVerse[]>([]);
  const [page, setPage] = useState(INITIAL_PAGE);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (requestedPage: number, refresh: boolean) => {
    const data = await listSavedVerses({ page: requestedPage, pageSize: PAGE_SIZE });

    setPage(data.page);
    setHasMore(data.hasMore);
    setVerses((current) => (refresh || requestedPage === INITIAL_PAGE ? data.items : [...current, ...data.items]));
  }, []);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchPage(INITIAL_PAGE, true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load saved verses.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await fetchPage(INITIAL_PAGE, true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to refresh saved verses.');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleDelete = useCallback(
    (verse: SavedVerse) => {
      Alert.alert('Delete saved verse?', verse.referenceText, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingIds((current) => new Set(current).add(verse.id));

              try {
                await deleteSavedVerse(verse.id);
                await fetchPage(INITIAL_PAGE, true);
              } catch (deleteError) {
                const message =
                  deleteError instanceof Error ? deleteError.message : 'Failed to delete saved verse.';
                Alert.alert('Delete failed', message);
              } finally {
                setDeletingIds((current) => {
                  const next = new Set(current);
                  next.delete(verse.id);
                  return next;
                });
              }
            })();
          },
        },
      ]);
    },
    [fetchPage],
  );

  const emptyText = useMemo(() => {
    if (error) {
      return null;
    }

    return 'No saved verses yet.';
  }, [error]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading saved verses…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => void loadInitial()}>
          <Text style={styles.refreshText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>

      <FlatList
        data={verses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        onRefresh={() => void refresh()}
        refreshing={isRefreshing}
        ListEmptyComponent={emptyText ? <Text style={styles.muted}>{emptyText}</Text> : null}
        renderItem={({ item }) => {
          const isDeleting = deletingIds.has(item.id);

          return (
            <View style={styles.verseRow}>
              <Text style={styles.reference}>{item.referenceText}</Text>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>

              <Pressable
                onPress={() => handleDelete(item)}
                disabled={isDeleting}
                style={[styles.deleteButton, isDeleting ? styles.deleteButtonDisabled : null]}
              >
                <Text style={styles.deleteText}>{isDeleting ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          hasMore ? <Text style={styles.footerText}>More verses available in future pagination updates.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  verseRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  reference: {
    fontWeight: '700',
    fontSize: 16,
  },
  note: {
    color: '#374151',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  footerText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 10,
  },
  muted: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  refreshText: {
    color: '#1f6feb',
    fontWeight: '600',
  },
});
