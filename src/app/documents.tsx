import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import PreparednessRegionCard from '../components/PreparednessRegionCard';
import { usePreparednessRegion } from '../hooks/usePreparednessRegion';
import {
  GLOBAL_DOCUMENT_CHECKLIST,
  GLOBAL_DOCUMENT_SOURCES,
} from '../data/preparednessByCountry';

type PreparedDocument = {
  id: string;
  title: string;
  category: string;
  prepared: boolean;
  storageNote: string;
  custom?: boolean;
};

const DEFAULT_DOCUMENTS: PreparedDocument[] =
  GLOBAL_DOCUMENT_CHECKLIST.map(item => ({
    id: item.id,
    title: item.title,
    category: 'Preparedness',
    prepared: false,
    storageNote: '',
  }));

export default function DocumentsScreen() {
  const user = auth.currentUser;
  const region = usePreparednessRegion();
  const { profile } = region;

  const [documents, setDocuments] =
    useState<PreparedDocument[]>(DEFAULT_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [noteModalVisible, setNoteModalVisible] =
    useState(false);
  const [editingDocumentId, setEditingDocumentId] =
    useState<string | null>(null);
  const [storageNote, setStorageNote] = useState('');

  const [addModalVisible, setAddModalVisible] =
    useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const dataRef = doc(
      db,
      'users',
      user.uid,
      'resourceData',
      'documents'
    );

    return onSnapshot(
      dataRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          if (Array.isArray(data.items)) {
            const savedItems = data.items.map(
              (item: any) => ({
                id: String(item.id ?? ''),
                title: String(item.title ?? ''),
                category: String(
                  item.category ?? 'Other'
                ),
                prepared: item.prepared === true,
                storageNote: String(
                  item.storageNote ?? ''
                ),
                custom: item.custom === true,
              })
            );

            if (savedItems.length > 0) {
              setDocuments(savedItems);
            }
          }
        }

        setLoading(false);
      },
      error => {
        console.warn(
          'Documents read error:',
          error
        );
        setLoading(false);
      }
    );
  }, [user?.uid]);

  const preparedCount = useMemo(
    () =>
      documents.filter(item => item.prepared)
        .length,
    [documents]
  );

  const progress =
    documents.length > 0
      ? (preparedCount / documents.length) * 100
      : 0;

  async function persist(
    nextDocuments: PreparedDocument[]
  ) {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in before saving document-preparedness information.'
      );
      return;
    }

    try {
      setSaving(true);

      await setDoc(
        doc(
          db,
          'users',
          user.uid,
          'resourceData',
          'documents'
        ),
        {
          items: nextDocuments,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn(
        'Documents save error:',
        error
      );

      Alert.alert(
        'Unable to save',
        'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePrepared(id: string) {
    const next = documents.map(item =>
      item.id === id
        ? {
            ...item,
            prepared: !item.prepared,
          }
        : item
    );

    setDocuments(next);
    await persist(next);
  }

  function openStorageNote(
    item: PreparedDocument
  ) {
    setEditingDocumentId(item.id);
    setStorageNote(item.storageNote);
    setNoteModalVisible(true);
  }

  async function saveStorageNote() {
    if (!editingDocumentId) return;

    const next = documents.map(item =>
      item.id === editingDocumentId
        ? {
            ...item,
            storageNote: storageNote.trim(),
          }
        : item
    );

    setDocuments(next);
    setNoteModalVisible(false);
    setEditingDocumentId(null);
    setStorageNote('');

    await persist(next);
  }

  async function addCustomDocument() {
    const title = newTitle.trim();

    if (!title) {
      Alert.alert(
        'Name required',
        'Enter a document or record name.'
      );
      return;
    }

    const next = [
      ...documents,
      {
        id: `custom-${Date.now()}`,
        title,
        category:
          newCategory.trim() || 'Other',
        prepared: false,
        storageNote: '',
        custom: true,
      },
    ];

    setDocuments(next);
    setAddModalVisible(false);
    setNewTitle('');
    setNewCategory('');

    await persist(next);
  }

  function confirmDelete(
    item: PreparedDocument
  ) {
    if (!item.custom) return;

    Alert.alert(
      'Delete custom item?',
      `Remove "${item.title}" from the checklist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = documents.filter(
              document =>
                document.id !== item.id
            );

            setDocuments(next);
            await persist(next);
          },
        },
      ]
    );
  }

  async function openSource(url: string) {
    const { Linking } = await import('react-native');

    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Important Documents
            </Text>
            <Text style={styles.subtitle}>
              Track whether essential records are prepared and know
              where protected copies are stored.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>📄</Text>
          </View>
        </View>

        <PreparednessRegionCard region={region} />

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Text style={styles.privacyEmoji}>🔒</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>
              Checklist only
            </Text>
            <Text style={styles.privacyText}>
              Alerta Ready stores only readiness status and an optional
              general storage note. Do not enter passwords, identity
              numbers, account numbers or document contents.
            </Text>
          </View>
        </View>

        <View style={styles.officialGuidanceCard}>
          <View style={styles.officialGuidanceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.officialGuidanceTitle}>
                Core document preparedness
              </Text>
              <Text style={styles.officialGuidanceSub}>
                General guidance for {profile.name}, based on established
                emergency-preparedness sources. Exact documents vary by country.
              </Text>
            </View>

            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                SOURCED
              </Text>
            </View>
          </View>

          {GLOBAL_DOCUMENT_CHECKLIST.map(item => (
            <View
              key={item.id}
              style={styles.guidanceItemRow}
            >
              <View style={styles.guidanceDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guidanceItemTitle}>
                  {item.title}
                </Text>
                <Text style={styles.officialGuidanceItem}>
                  {item.description}
                </Text>
              </View>
            </View>
          ))}

          <Text style={styles.localVariationText}>
            Local document requirements differ. Use this as a preparedness
            checklist, then confirm country-specific requirements with your
            government, insurer, healthcare provider or other relevant authority.
          </Text>

          <View style={styles.sourceRow}>
            {[
              ...GLOBAL_DOCUMENT_SOURCES,
              ...profile.sources,
            ]
              .filter(
                (source, index, array) =>
                  array.findIndex(
                    item => item.url === source.url
                  ) === index
              )
              .slice(0, 4)
              .map(source => (
                <Pressable
                  key={source.url}
                  style={styles.sourceButton}
                  onPress={() =>
                    openSource(source.url)
                  }
                >
                  <Text style={styles.sourceButtonText}>
                    {source.label} ↗
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>
                Document Readiness
              </Text>
              <Text style={styles.progressSub}>
                {preparedCount} of {documents.length} prepared
              </Text>
            </View>

            <Text style={styles.progressValue}>
              {Math.round(progress)}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Preparedness Checklist
            </Text>
            <Text style={styles.sectionSub}>
              Mark an item ready when you have protected access to a
              copy.
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>
              + Add
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>
              Loading checklist...
            </Text>
          </View>
        ) : (
          <View style={styles.documentList}>
            {documents.map(item => (
              <View
                key={item.id}
                style={[
                  styles.documentCard,
                  item.prepared &&
                    styles.documentCardPrepared,
                ]}
              >
                <Pressable
                  style={[
                    styles.checkCircle,
                    item.prepared &&
                      styles.checkCirclePrepared,
                  ]}
                  onPress={() =>
                    togglePrepared(item.id)
                  }
                >
                  {item.prepared && (
                    <Text style={styles.checkMark}>
                      ✓
                    </Text>
                  )}
                </Pressable>

                <View style={styles.documentInfo}>
                  <View style={styles.documentTitleRow}>
                    <Text
                      style={[
                        styles.documentTitle,
                        item.prepared &&
                          styles.documentTitlePrepared,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {item.custom && (
                      <View style={styles.customBadge}>
                        <Text
                          style={
                            styles.customBadgeText
                          }
                        >
                          CUSTOM
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.categoryText}>
                    {item.category}
                  </Text>

                  <Text
                    style={styles.storageText}
                    numberOfLines={2}
                  >
                    {item.storageNote
                      ? `Stored: ${item.storageNote}`
                      : 'Storage location not recorded'}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.noteButton}
                    onPress={() =>
                      openStorageNote(item)
                    }
                  >
                    <Text
                      style={styles.noteButtonText}
                    >
                      Note
                    </Text>
                  </Pressable>

                  {item.custom && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() =>
                        confirmDelete(item)
                      }
                    >
                      <Text
                        style={styles.deleteButtonText}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {saving && (
          <Text style={styles.savingText}>
            Saving changes...
          </Text>
        )}

        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>
            Privacy reminder
          </Text>
          <Text style={styles.guidanceItem}>
            Alerta Ready is only tracking whether you have prepared a document and where the copy is generally stored.
          </Text>
          <Text style={styles.guidanceItem}>
            Do not enter NRIC/passport numbers, bank details, passwords, policy numbers or medical record contents into this screen.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setNoteModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setNoteModalVisible(false)
            }
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Storage Note
            </Text>
            <Text style={styles.sheetDescription}>
              Use a general description such as "home waterproof
              folder" or "encrypted backup". Do not enter passwords
              or document numbers.
            </Text>

            <TextInput
              value={storageNote}
              onChangeText={setStorageNote}
              placeholder="e.g. Home waterproof folder"
              multiline
              style={[
                styles.input,
                styles.multilineInput,
              ]}
            />

            <Pressable
              style={styles.saveButton}
              onPress={saveStorageNote}
            >
              <Text style={styles.saveButtonText}>
                Save Note
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setAddModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setAddModalVisible(false)
            }
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Add Checklist Item
            </Text>

            <Text style={styles.inputLabel}>
              Document or record
            </Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Pet vaccination records"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>
              Category
            </Text>
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g. Pets"
              style={styles.input}
            />

            <Pressable
              style={styles.saveButton}
              onPress={addCustomDocument}
            >
              <Text style={styles.saveButtonText}>
                Add Item
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  backText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#6B7280',
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  headerEmoji: { fontSize: 22 },
  privacyCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    marginBottom: 14,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  privacyEmoji: { fontSize: 16 },
  privacyTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  privacyText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#475569',
  },
  officialGuidanceCard: {
    padding: 12,
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F8FFFB',
  },
  officialGuidanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  officialGuidanceTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  officialGuidanceSub: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },
  officialGuidanceItem: {
    marginBottom: 5,
    fontSize: 8,
    lineHeight: 12,
    color: '#374151',
  },
  verifiedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  verifiedBadgeText: {
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#15803D',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  sourceButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  sourceButtonText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#047857',
  },

  guidanceItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  guidanceDot: {
    width: 7,
    height: 7,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  guidanceItemTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#111827',
  },
  localVariationText: {
    marginTop: 4,
    padding: 9,
    borderRadius: 9,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
  },

  progressCard: {
    padding: 14,
    marginBottom: 18,
    borderRadius: 15,
    backgroundColor: '#0F2D26',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressSub: {
    marginTop: 3,
    fontSize: 9,
    color: '#D1FAE5',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#A7F3D0',
  },
  progressTrack: {
    height: 7,
    marginTop: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#315B50',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#34D399',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },
  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#079455',
  },
  addButtonText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  documentList: { gap: 8 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  documentCardPrepared: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  checkCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCirclePrepared: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  checkMark: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  documentInfo: {
    flex: 1,
    minWidth: 0,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  documentTitle: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  documentTitlePrepared: { color: '#166534' },
  customBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  customBadgeText: {
    fontSize: 6,
    fontWeight: '900',
    color: '#6B7280',
  },
  categoryText: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '700',
    color: '#047857',
  },
  storageText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 11,
    color: '#6B7280',
  },
  actions: {
    gap: 5,
    alignItems: 'stretch',
  },
  noteButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#ECFDF5',
  },
  noteButtonText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#047857',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#DC2626',
  },
  savingText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 8,
    color: '#6B7280',
  },
  guidanceCard: {
    padding: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
  },
  guidanceTitle: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  guidanceItem: {
    marginBottom: 4,
    fontSize: 8,
    lineHeight: 12,
    color: '#78350F',
  },
  loadingCard: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 9,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.38)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 15,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  sheetTitle: {
    marginBottom: 7,
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  sheetDescription: {
    marginBottom: 11,
    fontSize: 9,
    lineHeight: 13,
    color: '#6B7280',
  },
  inputLabel: {
    marginTop: 7,
    marginBottom: 5,
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },
  input: {
    minHeight: 43,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    fontSize: 10,
  },
  multilineInput: {
    minHeight: 78,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 43,
    marginTop: 13,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#079455',
  },
  saveButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
