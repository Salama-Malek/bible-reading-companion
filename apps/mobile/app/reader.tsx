import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { BibleVerse, getBibleChapter } from '@/src/api/bible';
import { saveVerse } from '@/src/api/verses';

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ date?: string; book?: string; chapter?: string }>();

  const date = getParam(params.date);
  const book = getParam(params.book);
  const chapter = getParam(params.chapter);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!book || !chapter) {
      setVerses([]);
      setChapterError('Missing book or chapter. Please open this screen from Home.');
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingChapter(true);
    setChapterError(null);

    void getBibleChapter(book, chapter)
      .then((nextVerses) => {
        if (!isMounted) {
          return;
        }

        setVerses(nextVerses);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : 'Failed to load chapter.';
        setVerses([]);
        setChapterError(message);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoadingChapter(false);
      });

    return () => {
      isMounted = false;
    };
  }, [book, chapter]);

  const getReferenceForVerse = useCallback(
    (verseNumber: number) => {
      if (!book || !chapter) {
        return '';
      }

      return `${book} ${chapter}:${verseNumber}`;
    },
    [book, chapter],
  );

  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      setReferenceText(getReferenceForVerse(verseNumber));
    },
    [getReferenceForVerse],
  );

  const openSaveModal = useCallback((verseNumber?: number) => {
    if (typeof verseNumber === 'number') {
      setReferenceText(getReferenceForVerse(verseNumber));
    }

    setIsModalVisible(true);
  }, [getReferenceForVerse]);

  const closeSaveModal = useCallback(() => {
    if (isSaving) {
      return;
    }

    setIsModalVisible(false);
  }, [isSaving]);

  const handleSaveVerse = useCallback(async () => {
    if (!date) {
      Alert.alert('Unable to save', 'Missing reading date. Please open this screen from Home.');
      return;
    }

    if (!referenceText.trim()) {
      Alert.alert('Reference required', 'Please add a verse reference.');
      return;
    }

    setIsSaving(true);

    try {
      await saveVerse({
        date,
        referenceText: referenceText.trim(),
        note: note.trim() || undefined,
      });

      setIsModalVisible(false);

      Alert.alert('Verse saved', 'Your verse has been saved.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save verse.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }, [date, note, referenceText]);

  const title = [book, chapter].filter(Boolean).join(' ');

  const renderVerseItem = useCallback(
    ({ item }: ListRenderItemInfo<BibleVerse>) => (
      <VerseRow
        verse={item}
        onPress={handleVerseTap}
        onLongPress={openSaveModal}
        isSelected={referenceText === getReferenceForVerse(item.verse)}
      />
    ),
    [getReferenceForVerse, handleVerseTap, openSaveModal, referenceText],
  );

  const keyExtractor = useCallback((item: BibleVerse) => String(item.verse), []);

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.title}>{title || 'Reader'}</Text>
        <Text style={styles.subtitle}>{date || 'No date provided'}</Text>

        <Pressable style={styles.saveButton} onPress={() => openSaveModal()}>
          <Text style={styles.saveButtonText}>Save Selected Verse</Text>
        </Pressable>
      </View>
    ),
    [date, openSaveModal, title],
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoadingChapter ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Loading verses…</Text>
        </View>
      ) : null}

      {!isLoadingChapter && chapterError ? (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{chapterError}</Text>
        </View>
      ) : null}

      {!isLoadingChapter && !chapterError ? (
        <FlatList
          data={verses}
          keyExtractor={keyExtractor}
          renderItem={renderVerseItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          removeClippedSubviews
        />
      ) : null}

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeSaveModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Verse</Text>

            <Text style={styles.inputLabel}>Reference</Text>
            <TextInput
              value={referenceText}
              onChangeText={setReferenceText}
              style={styles.input}
              placeholder="John 3:16"
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.multilineInput]}
              placeholder="Write a reflection"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={closeSaveModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmButton, isSaving ? styles.confirmButtonDisabled : null]}
                onPress={() => void handleSaveVerse()}
                disabled={isSaving}
              >
                <Text style={styles.confirmButtonText}>{isSaving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type VerseRowProps = {
  verse: BibleVerse;
  isSelected: boolean;
  onPress: (verseNumber: number) => void;
  onLongPress: (verseNumber: number) => void;
};

const VerseRow = memo(function VerseRow({ verse, isSelected, onPress, onLongPress }: VerseRowProps) {
  const handlePress = useCallback(() => {
    onPress(verse.verse);
  }, [onPress, verse.verse]);

  const handleLongPress = useCallback(() => {
    onLongPress(verse.verse);
  }, [onLongPress, verse.verse]);

  return (
    <Pressable
      style={[styles.verseRow, isSelected ? styles.verseRowSelected : null]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={200}
    >
      <Text style={styles.verseNumber}>{verse.verse}</Text>
      <Text style={styles.verseText}>{verse.text}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statusText: {
    color: '#374151',
    fontSize: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 16,
    textAlign: 'center',
  },
  verseRow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  verseRowSelected: {
    borderColor: '#1f6feb',
    backgroundColor: '#eff6ff',
  },
  verseNumber: {
    width: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  verseText: {
    flex: 1,
    color: '#1f2937',
    lineHeight: 23,
  },
  saveButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 96,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
