import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import PreparednessRegionCard from '../components/PreparednessRegionCard';
import { usePreparednessRegion } from '../hooks/usePreparednessRegion';

type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
};

const EMPTY_FORM = {
  name: '',
  relationship: '',
  phone: '',
  isPrimary: false,
};

export default function ContactsScreen() {
  const user = auth.currentUser;
  const region = usePreparednessRegion();
  const { profile } = region;
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const contactsRef = collection(
      db,
      'users',
      user.uid,
      'emergencyContacts'
    );

    return onSnapshot(
      contactsRef,
      snapshot => {
        const items = snapshot.docs.map(contactDoc => {
          const data = contactDoc.data();

          return {
            id: contactDoc.id,
            name: String(data.name ?? ''),
            relationship: String(data.relationship ?? ''),
            phone: String(data.phone ?? ''),
            isPrimary: data.isPrimary === true,
          };
        });

        items.sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        });

        setContacts(items);
        setLoading(false);
      },
      error => {
        console.warn('Contacts read error:', error);
        setLoading(false);
      }
    );
  }, [user?.uid]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(contact: EmergencyContact) {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      isPrimary: contact.isPrimary,
    });
    setModalVisible(true);
  }

  function closeModal() {
    if (saving) return;

    setModalVisible(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function makeOtherContactsNonPrimary(
    exceptId?: string | null
  ) {
    if (!user) return;

    await Promise.all(
      contacts
        .filter(
          contact =>
            contact.isPrimary &&
            contact.id !== exceptId
        )
        .map(contact =>
          updateDoc(
            doc(
              db,
              'users',
              user.uid,
              'emergencyContacts',
              contact.id
            ),
            { isPrimary: false }
          )
        )
    );
  }

  async function saveContact() {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in before saving a contact.'
      );
      return;
    }

    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name || !phone) {
      Alert.alert(
        'Missing information',
        'Please enter a name and phone number.'
      );
      return;
    }

    try {
      setSaving(true);

      if (form.isPrimary) {
        await makeOtherContactsNonPrimary(editingId);
      }

      if (editingId) {
        await updateDoc(
          doc(
            db,
            'users',
            user.uid,
            'emergencyContacts',
            editingId
          ),
          {
            name,
            relationship: form.relationship.trim(),
            phone,
            isPrimary: form.isPrimary,
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            'users',
            user.uid,
            'emergencyContacts'
          ),
          {
            name,
            relationship: form.relationship.trim(),
            phone,
            isPrimary: form.isPrimary,
            createdAt: serverTimestamp(),
          }
        );
      }

      setModalVisible(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.warn('Contact save error:', error);
      Alert.alert(
        'Unable to save',
        'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function deleteContact(contact: EmergencyContact) {
    if (!user) return;

    Alert.alert(
      'Delete contact?',
      `Remove ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(
                  db,
                  'users',
                  user.uid,
                  'emergencyContacts',
                  contact.id
                )
              );
            } catch (error) {
              Alert.alert(
                'Unable to delete',
                'Please try again.'
              );
            }
          },
        },
      ]
    );
  }

  async function callContact(phone: string) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const url = `tel:${cleaned}`;

    if (!cleaned || !(await Linking.canOpenURL(url))) {
      Alert.alert(
        'Calling unavailable',
        'Phone calling is not available on this device or emulator.'
      );
      return;
    }

    await Linking.openURL(url);
  }

  const primary =
    contacts.find(contact => contact.isPrimary) ?? null;

  async function sendEmergencySms(number: string) {
    const url = `sms:${number}`;

    if (!(await Linking.canOpenURL(url))) {
      Alert.alert(
        'SMS unavailable',
        'SMS messaging is not available on this device or emulator.'
      );
      return;
    }

    await Linking.openURL(url);
  }

  async function openSource(url: string) {
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
              Emergency Contacts
            </Text>
            <Text style={styles.subtitle}>
              Keep trusted people easy to reach during an emergency.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>📞</Text>
          </View>
        </View>

        <PreparednessRegionCard region={region} />

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Personal emergency contacts
          </Text>
          <Text style={styles.infoText}>
            Alerta Ready separates official regional emergency services
            from your own trusted contacts. Always follow the instructions
            of the emergency operator and local authorities.
          </Text>
        </View>

        {primary && (
          <View style={styles.primaryCard}>
            <Text style={styles.primaryLabel}>
              ★ PRIMARY CONTACT
            </Text>
            <Text style={styles.primaryName}>
              {primary.name}
            </Text>
            <Text style={styles.primaryMeta}>
              {primary.relationship || 'Trusted contact'} •{' '}
              {primary.phone}
            </Text>

            <Pressable
              style={styles.primaryCallButton}
              onPress={() => callContact(primary.phone)}
            >
              <Text style={styles.primaryCallText}>
                Call Primary Contact
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.officialSection}>
          <View style={styles.officialHeadingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Official Emergency Services
              </Text>
              <Text style={styles.sectionSub}>
                {profile.name} • regional information
              </Text>
            </View>

            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                SOURCED
              </Text>
            </View>
          </View>

          {profile.emergencyServices.length === 0 ? (
            <View style={styles.unsupportedCard}>
              <Text style={styles.unsupportedTitle}>
                Local emergency numbers not configured
              </Text>
              <Text style={styles.unsupportedText}>
                Alerta Ready does not guess emergency numbers for unsupported
                regions. Confirm the correct numbers with your local authority,
                or use Change to select a supported region if you are travelling.
              </Text>
            </View>
          ) : (
            <View style={styles.officialList}>
              {profile.emergencyServices.map(service => (
                <View
                  key={service.id}
                  style={styles.officialCard}
                >
                  <View style={styles.officialNumberBox}>
                    <Text style={styles.officialNumber}>
                      {service.number}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.officialAgency}>
                      {service.agency}
                    </Text>

                    <Text style={styles.officialTitle}>
                      {service.label}
                    </Text>

                    <Text style={styles.officialDescription}>
                      {service.description}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.officialAction}
                    onPress={() =>
                      service.action === 'call'
                        ? callContact(service.number)
                        : sendEmergencySms(service.number)
                    }
                  >
                    <Text style={styles.officialActionText}>
                      {service.action === 'call'
                        ? 'Call'
                        : 'SMS'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {profile.sources.length > 0 && (
            <View style={styles.sourceRow}>
              {profile.sources.map(source => (
                <Pressable
                  key={source.url}
                  style={styles.sourceButton}
                  onPress={() => openSource(source.url)}
                >
                  <Text style={styles.sourceButtonText}>
                    {source.label} ↗
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.sourceUpdatedText}>
            {profile.coverageNote}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your Contacts
            </Text>
            <Text style={styles.sectionSub}>
              {contacts.length} saved
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={openAdd}
          >
            <Text style={styles.addButtonText}>
              + Add
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator />
            <Text style={styles.emptyText}>
              Loading contacts...
            </Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>☎️</Text>
            <Text style={styles.emptyTitle}>
              No contacts yet
            </Text>
            <Text style={styles.emptyText}>
              Add at least one trusted emergency contact.
            </Text>
          </View>
        ) : (
          <View style={styles.contactList}>
            {contacts.map(contact => (
              <View
                key={contact.id}
                style={styles.contactCard}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>
                    {contact.name}{' '}
                    {contact.isPrimary ? '★' : ''}
                  </Text>
                  <Text style={styles.contactMeta}>
                    {contact.relationship || 'Trusted contact'}
                  </Text>
                  <Text style={styles.contactPhone}>
                    {contact.phone}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.callButton}
                    onPress={() =>
                      callContact(contact.phone)
                    }
                  >
                    <Text style={styles.callText}>Call</Text>
                  </Pressable>

                  <Pressable
                    style={styles.editButton}
                    onPress={() => openEdit(contact)}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => deleteContact(contact)}
                  >
                    <Text style={styles.deleteText}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeModal}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingId ? 'Edit Contact' : 'Add Contact'}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={name =>
                setForm(previous => ({
                  ...previous,
                  name,
                }))
              }
              placeholder="e.g. Mum"
            />

            <Text style={styles.inputLabel}>
              Relationship
            </Text>
            <TextInput
              style={styles.input}
              value={form.relationship}
              onChangeText={relationship =>
                setForm(previous => ({
                  ...previous,
                  relationship,
                }))
              }
              placeholder="e.g. Family"
            />

            <Text style={styles.inputLabel}>
              Phone number
            </Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={phone =>
                setForm(previous => ({
                  ...previous,
                  phone,
                }))
              }
              keyboardType="phone-pad"
              placeholder="+65 9123 4567"
            />

            <Pressable
              style={[
                styles.primaryToggle,
                form.isPrimary &&
                  styles.primaryToggleActive,
              ]}
              onPress={() =>
                setForm(previous => ({
                  ...previous,
                  isPrimary: !previous.isPrimary,
                }))
              }
            >
              <View
                style={[
                  styles.toggleCircle,
                  form.isPrimary &&
                    styles.toggleCircleActive,
                ]}
              >
                {form.isPrimary && (
                  <Text style={styles.toggleCheck}>✓</Text>
                )}
              </View>

              <Text style={styles.toggleText}>
                Set as primary contact
              </Text>
            </Pressable>

            <Pressable
              style={styles.saveButton}
              disabled={saving}
              onPress={saveContact}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Contact'}
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
  infoCard: {
    padding: 12,
    marginBottom: 14,
    borderRadius: 13,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
  },
  infoText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: '#4B5563',
  },
  primaryCard: {
    padding: 14,
    marginBottom: 17,
    borderRadius: 15,
    backgroundColor: '#0F2D26',
  },
  primaryLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#A7F3D0',
  },
  primaryName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  primaryMeta: {
    marginTop: 3,
    fontSize: 10,
    color: '#D1FAE5',
  },
  primaryCallButton: {
    minHeight: 39,
    marginTop: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
  },
  primaryCallText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  officialSection: {
    marginBottom: 20,
  },
  officialHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
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
  officialList: {
    gap: 8,
  },
  officialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  officialNumberBox: {
    width: 48,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  officialNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },
  officialAgency: {
    fontSize: 7,
    fontWeight: '800',
    color: '#6B7280',
  },
  officialTitle: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  officialDescription: {
    marginTop: 2,
    fontSize: 7,
    lineHeight: 11,
    color: '#6B7280',
  },
  officialAction: {
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#079455',
  },
  officialActionText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
  },
  sourceButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  sourceButtonText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#374151',
  },
  sourceUpdatedText: {
    marginTop: 6,
    fontSize: 7,
    color: '#9CA3AF',
  },

  unsupportedCard: {
    padding: 11,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  unsupportedTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9A3412',
  },
  unsupportedText: {
    marginTop: 4,
    fontSize: 8,
    lineHeight: 12,
    color: '#7C2D12',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 9,
    color: '#9CA3AF',
  },
  addButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#079455',
  },
  addButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  contactList: { gap: 8 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803D',
  },
  contactName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },
  contactMeta: {
    marginTop: 2,
    fontSize: 9,
    color: '#6B7280',
  },
  contactPhone: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  actions: {
    gap: 5,
    alignItems: 'center',
  },
  callButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#ECFDF5',
  },
  callText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#047857',
  },
  editButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
  },
  editText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#4B5563',
  },
  deleteText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#DC2626',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  emptyText: {
    marginTop: 5,
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
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  inputLabel: {
    marginTop: 8,
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
    fontSize: 11,
  },
  primaryToggle: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  primaryToggleActive: {
    backgroundColor: '#ECFDF5',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCircleActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  toggleCheck: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  saveButton: {
    minHeight: 44,
    marginTop: 15,
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
