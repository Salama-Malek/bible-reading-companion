import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { saveVerse } from '@/src/api/verses';

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ date?: string; book?: string; chapter?: string }>();

  const date = getParam(params.date);
  const book = getParam(params.book);
  const chapter = getParam(params.chapter);

  const defaultReference = useMemo(() => {
    if (!book || !chapter) {
      return '';
    }

    return `${book} ${chapter}:`;
  }, [book, chapter]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [referenceText, setReferenceText] = useState(defaultReference);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openSaveModal = useCallback(() => {
    setReferenceText((current) => current || defaultReference);
    setIsModalVisible(true);
  }, [defaultReference]);

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

      Alert.alert('Verse saved', 'Your verse has been saved.', [
        {
          text: 'View saved verses',
          onPress: () => router.push('/(tabs)/saved'),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save verse.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }, [date, note, referenceText]);

  const title = [book, chapter].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title || 'Reader'}</Text>
        <Text style={styles.subtitle}>{date || 'No date provided'}</Text>

        <View style={styles.readerCard}>
          <Text style={styles.readerText}>
            In-app reading content is coming soon. For now, use this screen to track today&apos;s passage and
            save verse references with notes.
          </Text>
        </View>

        <Pressable style={styles.saveButton} onPress={openSaveModal}>
          <Text style={styles.saveButtonText}>Save Verse</Text>
        </Pressable>
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
  },
  readerCard: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  readerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
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
