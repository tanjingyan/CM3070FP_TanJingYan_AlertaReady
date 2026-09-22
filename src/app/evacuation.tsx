import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  GLOBAL_EVACUATION_GUIDANCE,
  GLOBAL_EVACUATION_SOURCES,
} from '../data/preparednessByCountry';

type EvacuationChecklist = {
  primaryRoute: boolean;
  alternateRoute: boolean;
  meetingPoint: boolean;
  transportPlan: boolean;
  householdReview: boolean;
};

type EvacuationPlan = {
  primaryMeetingPoint: string;
  alternateMeetingPoint: string;
  transportPlan: string;
  routeNotes: string;
  checklist: EvacuationChecklist;
};

const DEFAULT_CHECKLIST: EvacuationChecklist = {
  primaryRoute: false,
  alternateRoute: false,
  meetingPoint: false,
  transportPlan: false,
  householdReview: false,
};

const DEFAULT_PLAN: EvacuationPlan = {
  primaryMeetingPoint: '',
  alternateMeetingPoint: '',
  transportPlan: '',
  routeNotes: '',
  checklist: DEFAULT_CHECKLIST,
};

const CHECKLIST_ITEMS: Array<{
  key: keyof EvacuationChecklist;
  title: string;
  description: string;
}> = [
  {
    key: 'primaryRoute',
    title: 'Identify a primary route',
    description:
      'Know your main route away from home, school or work.',
  },
  {
    key: 'alternateRoute',
    title: 'Identify an alternate route',
    description:
      'Have a second option if the main route is blocked.',
  },
  {
    key: 'meetingPoint',
    title: 'Choose a meeting point',
    description:
      'Select a clear place where household members can reunite.',
  },
  {
    key: 'transportPlan',
    title: 'Plan transport',
    description:
      'Consider walking, public transport or a vehicle.',
  },
  {
    key: 'householdReview',
    title: 'Review the plan together',
    description:
      'Make sure everyone understands where to go.',
  },
];

export default function EvacuationScreen() {
  const user = auth.currentUser;
  const region = usePreparednessRegion();
  const { profile } = region;

  const [plan, setPlan] = useState<EvacuationPlan>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const planRef = doc(
      db,
      'users',
      user.uid,
      'resourceData',
      'evacuation'
    );

    return onSnapshot(
      planRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setPlan({
            primaryMeetingPoint: String(
              data.primaryMeetingPoint ?? ''
            ),
            alternateMeetingPoint: String(
              data.alternateMeetingPoint ?? ''
            ),
            transportPlan: String(
              data.transportPlan ?? ''
            ),
            routeNotes: String(data.routeNotes ?? ''),
            checklist: {
              ...DEFAULT_CHECKLIST,
              ...(data.checklist ?? {}),
            },
          });
        }

        setLoading(false);
      },
      error => {
        console.warn('Evacuation plan read error:', error);
        setLoading(false);
      }
    );
  }, [user?.uid]);

  const completedCount = useMemo(
    () =>
      Object.values(plan.checklist).filter(Boolean).length,
    [plan.checklist]
  );

  const progress =
    (completedCount / CHECKLIST_ITEMS.length) * 100;

  async function savePlan() {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in before saving an evacuation plan.'
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
          'evacuation'
        ),
        {
          ...plan,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        'Plan saved',
        'Your evacuation plan has been updated.'
      );
    } catch (error) {
      console.warn('Evacuation plan save error:', error);
      Alert.alert(
        'Unable to save',
        'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklistItem(
    key: keyof EvacuationChecklist
  ) {
    if (!user) return;

    const nextChecklist = {
      ...plan.checklist,
      [key]: !plan.checklist[key],
    };

    setPlan(previous => ({
      ...previous,
      checklist: nextChecklist,
    }));

    try {
      await setDoc(
        doc(
          db,
          'users',
          user.uid,
          'resourceData',
          'evacuation'
        ),
        {
          checklist: nextChecklist,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn(
        'Evacuation checklist save error:',
        error
      );
    }
  }

  async function openDirections(destination: string) {
    const cleanedDestination = destination.trim();

    if (!cleanedDestination) {
      Alert.alert(
        'Add a destination',
        'Enter a meeting point first.'
      );
      return;
    }

    const url =
      'https://www.google.com/maps/dir/?api=1' +
      `&destination=${encodeURIComponent(
        cleanedDestination
      )}`;

    if (!(await Linking.canOpenURL(url))) {
      Alert.alert(
        'Maps unavailable',
        'Unable to open directions on this device.'
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
              Evacuation Plan
            </Text>
            <Text style={styles.subtitle}>
              Prepare where to go and how to get there before an
              emergency happens.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🏃</Text>
          </View>
        </View>

        <PreparednessRegionCard region={region} />

        <View style={styles.officialGuidanceCard}>
          <View style={styles.officialGuidanceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.officialGuidanceTitle}>
                Evacuation guidance
              </Text>
              <Text style={styles.officialGuidanceSub}>
                General preparedness guidance for {profile.name}. Local
                authorities may issue different instructions for a specific event.
              </Text>
            </View>

            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                SOURCED
              </Text>
            </View>
          </View>

          {GLOBAL_EVACUATION_GUIDANCE.map(
            (item, index) => (
              <View
                key={`${index}-${item}`}
                style={styles.guidanceRow}
              >
                <View style={styles.guidanceNumber}>
                  <Text style={styles.guidanceNumberText}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={styles.guidanceText}>
                  {item}
                </Text>
              </View>
            )
          )}

          {profile.localEvacuationNotes &&
            profile.localEvacuationNotes.length > 0 && (
              <View style={styles.localGuidanceCard}>
                <Text style={styles.localGuidanceTitle}>
                  Regional note • {profile.name}
                </Text>

                {profile.localEvacuationNotes.map(note => (
                  <Text
                    key={note}
                    style={styles.localGuidanceText}
                  >
                    • {note}
                  </Text>
                ))}
              </View>
            )}

          <View style={styles.sourceRow}>
            {[
              ...GLOBAL_EVACUATION_SOURCES,
              ...profile.sources,
            ]
              .filter(
                (source, index, array) =>
                  array.findIndex(
                    item => item.url === source.url
                  ) === index
              )
              .slice(0, 5)
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

          <Text style={styles.coverageNote}>
            {profile.coverageNote}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={styles.progressTitle}>
                Plan Readiness
              </Text>
              <Text style={styles.progressSub}>
                {completedCount} of {CHECKLIST_ITEMS.length}{' '}
                preparation steps completed
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

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>
              Loading evacuation plan...
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Meeting Points
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>
                Primary meeting point
              </Text>
              <TextInput
                value={plan.primaryMeetingPoint}
                onChangeText={primaryMeetingPoint =>
                  setPlan(previous => ({
                    ...previous,
                    primaryMeetingPoint,
                  }))
                }
                placeholder="e.g. Community centre on Main Street"
                style={styles.input}
              />

              <Pressable
                style={styles.directionButton}
                onPress={() =>
                  openDirections(plan.primaryMeetingPoint)
                }
              >
                <Text style={styles.directionButtonText}>
                  Open Directions
                </Text>
              </Pressable>

              <Text style={styles.inputLabel}>
                Alternate meeting point
              </Text>
              <TextInput
                value={plan.alternateMeetingPoint}
                onChangeText={alternateMeetingPoint =>
                  setPlan(previous => ({
                    ...previous,
                    alternateMeetingPoint,
                  }))
                }
                placeholder="e.g. Relative's home outside the area"
                style={styles.input}
              />

              <Pressable
                style={styles.secondaryDirectionButton}
                onPress={() =>
                  openDirections(plan.alternateMeetingPoint)
                }
              >
                <Text
                  style={styles.secondaryDirectionText}
                >
                  Open Alternate Directions
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>
              Transport & Route Notes
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>
                Transport plan
              </Text>
              <TextInput
                value={plan.transportPlan}
                onChangeText={transportPlan =>
                  setPlan(previous => ({
                    ...previous,
                    transportPlan,
                  }))
                }
                placeholder="e.g. Walk to meeting point; use car if instructed"
                multiline
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
              />

              <Text style={styles.inputLabel}>
                Route notes
              </Text>
              <TextInput
                value={plan.routeNotes}
                onChangeText={routeNotes =>
                  setPlan(previous => ({
                    ...previous,
                    routeNotes,
                  }))
                }
                placeholder="Record exits, landmarks, hazards or alternative paths"
                multiline
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
              />

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                disabled={saving}
                onPress={savePlan}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? 'Saving...'
                    : 'Save Evacuation Plan'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>
                Preparedness Checklist
              </Text>
              <Text style={styles.sectionSubtitle}>
                Tap each step after reviewing it.
              </Text>
            </View>

            <View style={styles.checklist}>
              {CHECKLIST_ITEMS.map(item => {
                const checked = plan.checklist[item.key];

                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.checkRow,
                      checked &&
                        styles.checkRowCompleted,
                    ]}
                    onPress={() =>
                      toggleChecklistItem(item.key)
                    }
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        checked &&
                          styles.checkCircleCompleted,
                      ]}
                    >
                      {checked && (
                        <Text style={styles.checkMark}>
                          ✓
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.checkTitle,
                          checked &&
                            styles.checkTitleCompleted,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.checkText}>
                        {item.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.mapCard}>
              <View style={styles.mapCardIcon}>
                <Text style={styles.mapCardEmoji}>🗺️</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.mapCardTitle}>
                  Check current hazard conditions
                </Text>
                <Text style={styles.mapCardText}>
                  Review monitored hazards near your current location
                  before travelling.
                </Text>
              </View>

              <Pressable
                style={styles.mapOpenButton}
                onPress={() =>
                  router.push('/(tabs)/map' as any)
                }
              >
                <Text style={styles.mapOpenText}>
                  Open
                </Text>
              </Pressable>
            </View>

            <View style={styles.safetyNote}>
              <Text style={styles.safetyNoteTitle}>
                Important
              </Text>
              <Text style={styles.safetyNoteText}>
                Your saved meeting points and route notes are personal planning
                aids, not official evacuation routes. During an actual emergency,
                follow local emergency-management authorities, public warnings
                and evacuation orders for your current location.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
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
    marginBottom: 9,
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
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  guidanceNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },
  guidanceNumberText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#15803D',
  },
  guidanceText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 12,
    color: '#374151',
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
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

  localGuidanceCard: {
    padding: 9,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 9,
    backgroundColor: '#F0FDF4',
  },
  localGuidanceTitle: {
    marginBottom: 4,
    fontSize: 8,
    fontWeight: '900',
    color: '#166534',
  },
  localGuidanceText: {
    marginBottom: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#374151',
  },
  coverageNote: {
    marginTop: 7,
    fontSize: 7,
    lineHeight: 11,
    color: '#9CA3AF',
  },

  progressCard: {
    padding: 14,
    marginBottom: 18,
    borderRadius: 15,
    backgroundColor: '#0F2D26',
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  sectionTitle: {
    marginBottom: 9,
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  formCard: {
    padding: 13,
    marginBottom: 17,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inputLabel: {
    marginBottom: 5,
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },
  input: {
    minHeight: 43,
    paddingHorizontal: 11,
    marginBottom: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    fontSize: 10,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 78,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  directionButton: {
    minHeight: 38,
    marginBottom: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#079455',
  },
  directionButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secondaryDirectionButton: {
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  secondaryDirectionText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#047857',
  },
  saveButton: {
    minHeight: 43,
    marginTop: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#079455',
  },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionHeader: { marginBottom: 10 },
  sectionTitleNoMargin: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: '#6B7280',
  },
  checklist: {
    gap: 8,
    marginBottom: 17,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  checkRowCompleted: {
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
  checkCircleCompleted: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  checkMark: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  checkTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  checkTitleCompleted: { color: '#166534' },
  checkText: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
  },
  mapCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
  },
  mapCardEmoji: { fontSize: 18 },
  mapCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065F46',
  },
  mapCardText: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 12,
    color: '#4B5563',
  },
  mapOpenButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#079455',
  },
  mapOpenText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  safetyNote: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },
  safetyNoteTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9A3412',
  },
  safetyNoteText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#7C2D12',
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
});
