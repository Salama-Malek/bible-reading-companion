import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { completeReadingForDate, getLocalDateString, getTodayCompletionState } from '@/src/api/reading';
import { getTodayPlan } from '@/src/api/plans';

type ReadingMethod = 'physical' | 'digital';

export default function HomeScreen() {
  const [method, setMethod] = useState<ReadingMethod | null>(null);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getTodayPlan>>>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [todayPlan, completionState] = await Promise.all([getTodayPlan(), getTodayCompletionState()]);
      setPlan(todayPlan);
      setIsCompleted(completionState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load home data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const canMarkAsRead = Boolean(plan && method && !isCompleted && !isSubmitting);

  const handleReadInsideApp = useCallback(() => {
    setMethod('digital');

    if (!plan) {
      return;
    }

    router.push({
      pathname: '/reader',
      params: {
        date: plan.date,
        book: plan.book,
        chapter: String(plan.chapter),
      },
    });
  }, [plan]);

  const handleMarkAsRead = useCallback(async () => {
    if (!plan || !method || isCompleted || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await completeReadingForDate({
        date: plan.date ?? getLocalDateString(),
        method,
      });
      setIsCompleted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to mark today as read.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isCompleted, isSubmitting, method, plan]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading today's reading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Reading</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {plan ? (
        <View style={styles.card}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{plan.date}</Text>

          <Text style={styles.label}>Testament</Text>
          <Text style={styles.value}>{plan.testament}</Text>

          <Text style={styles.label}>Passage</Text>
          <Text style={styles.value}>
            {plan.book} {plan.chapter}
          </Text>
        </View>
      ) : (
        <Text style={styles.empty}>No plan for today</Text>
      )}

      <View style={styles.methodsContainer}>
        <Text style={styles.sectionTitle}>Reading method</Text>

        <Pressable
          style={[styles.methodButton, method === 'physical' ? styles.methodButtonSelected : null]}
          onPress={() => setMethod('physical')}
        >
          <Text style={styles.methodButtonText}>I will read from my Bible</Text>
        </Pressable>

        <Pressable
          style={[styles.methodButton, method === 'digital' ? styles.methodButtonSelected : null]}
          onPress={handleReadInsideApp}
        >
          <Text style={styles.methodButtonText}>Read inside the app</Text>
        </Pressable>
      </View>

      {isCompleted ? <Text style={styles.completedBadge}>Completed today</Text> : null}

      <Pressable
        onPress={handleMarkAsRead}
        disabled={!canMarkAsRead}
        style={[styles.markButton, !canMarkAsRead ? styles.markButtonDisabled : null]}
      >
        <Text style={styles.markButtonText}>{isSubmitting ? 'Marking…' : 'Mark as Read'}</Text>
      </Pressable>

      <Pressable onPress={() => void loadHomeData()} style={styles.refreshButton}>
        <Text style={styles.refreshText}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: '#f8fafc',
  },
  label: {
    color: '#4b5563',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    marginBottom: 6,
  },
  empty: {
    fontSize: 16,
    color: '#6b7280',
  },
  methodsContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 10,
  },
  methodButtonSelected: {
    borderColor: '#1f6feb',
    backgroundColor: '#e8f0fe',
  },
  methodButtonText: {
    fontWeight: '600',
  },
  markButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  markButtonDisabled: {
    opacity: 0.5,
  },
  markButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  errorText: {
    color: '#b91c1c',
  },
  muted: {
    color: '#6b7280',
  },
  refreshButton: {
    alignSelf: 'flex-start',
  },
  refreshText: {
    color: '#1f6feb',
    fontWeight: '600',
  },
});
