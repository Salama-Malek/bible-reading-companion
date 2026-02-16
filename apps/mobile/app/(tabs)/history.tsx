import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReadingHistoryResponse, getReadingHistory } from '@/src/api/reading';
import {
  getDateRangeDescendingAsEuropeRigaYYYYMMDD,
  getLastNDaysRangeAsEuropeRigaYYYYMMDD,
} from '@/src/utils/europeRigaDate';

type DayHistoryItem = {
  date: string;
  planLabel: string | null;
  statusLabel: string;
  statusColor: string;
};

const HISTORY_DAYS = 30;

export default function HistoryScreen() {
  const [history, setHistory] = useState<ReadingHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => getLastNDaysRangeAsEuropeRigaYYYYMMDD(HISTORY_DAYS), []);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getReadingHistory(from, to);
      setHistory(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const dayItems = useMemo<DayHistoryItem[]>(() => {
    if (!history) {
      return [];
    }

    const plansByDate = new Map(history.plans.map((plan) => [plan.date, plan]));
    const recordsByDate = new Map(history.records.map((record) => [record.date ?? '', record]));
    const missedDates = new Set(history.missedDates);

    const datesDescending = getDateRangeDescendingAsEuropeRigaYYYYMMDD(from, to);

    return datesDescending.map((date) => {
      const plan = plansByDate.get(date);
      const record = recordsByDate.get(date);

      if (record) {
        return {
          date,
          planLabel: plan ? `${plan.book} ${plan.chapter}` : null,
          statusLabel: `Completed (${record.method})`,
          statusColor: '#166534',
        };
      }

      if (missedDates.has(date)) {
        return {
          date,
          planLabel: plan ? `${plan.book} ${plan.chapter}` : null,
          statusLabel: 'Missed',
          statusColor: '#b45309',
        };
      }

      return {
        date,
        planLabel: plan ? `${plan.book} ${plan.chapter}` : null,
        statusLabel: 'No plan',
        statusColor: '#6b7280',
      };
    });
  }, [from, history, to]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading reading history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => void loadHistory()}>
          <Text style={styles.refreshText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <View style={styles.summaryGrid}>
        <SummaryCard label="Completed" value={history?.summary.completedCount ?? 0} />
        <SummaryCard label="Missed" value={history?.summary.missedCount ?? 0} />
        <SummaryCard label="Current streak" value={history?.summary.currentStreak ?? 0} />
        <SummaryCard label="Longest streak" value={history?.summary.longestStreak ?? 0} />
      </View>

      <FlatList
        data={dayItems}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.dayRow}>
            <Text style={styles.dayDate}>{item.date}</Text>
            <Text style={styles.dayPlan}>{item.planLabel ?? '—'}</Text>
            <Text style={[styles.dayStatus, { color: item.statusColor }]}>{item.statusLabel}</Text>
          </View>
        )}
      />
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  summaryLabel: {
    color: '#4b5563',
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
  },
  listContent: {
    gap: 8,
    paddingBottom: 12,
  },
  dayRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    gap: 3,
  },
  dayDate: {
    fontWeight: '700',
  },
  dayPlan: {
    color: '#111827',
  },
  dayStatus: {
    fontWeight: '600',
  },
  muted: {
    color: '#6b7280',
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
