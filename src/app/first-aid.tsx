import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import PreparednessRegionCard from '../components/PreparednessRegionCard';
import { usePreparednessRegion } from '../hooks/usePreparednessRegion';

const INFO_REVIEWED = '22 September 2026';

const IFRC_FIRST_AID_SOURCE =
  'https://www.ifrc.org/our-work/health-and-care/first-aid';

const IFRC_GUIDELINES_SOURCE =
  'https://www.ifrc.org/document/international-first-aid-resuscitation-and-education-guidelines';

const FIRST_AID_TOPICS = [
  {
    id: 'cardiac-arrest',
    icon: '❤️',
    title: 'Cardiac arrest and resuscitation',
    text:
      'The IFRC international guidelines cover recognition of cardiac arrest, resuscitation and AED use. Practical first-aid training is recommended.',
  },
  {
    id: 'choking',
    icon: '🫁',
    title: 'Choking',
    text:
      'Airway obstruction and choking are covered in the IFRC international first-aid guidelines. In an emergency, contact local emergency services and follow trained or dispatcher guidance.',
  },
  {
    id: 'bleeding',
    icon: '🩸',
    title: 'Severe bleeding and wounds',
    text:
      'The IFRC guidelines include evidence-based first-aid guidance for bleeding and wound emergencies. Serious bleeding requires urgent professional help.',
  },
  {
    id: 'burns',
    icon: '🔥',
    title: 'Burns',
    text:
      'Burn care is included in the IFRC international first-aid guidelines. Serious or extensive burns require professional medical assessment.',
  },
  {
    id: 'unresponsive',
    icon: '🧍',
    title: 'Unresponsive person',
    text:
      'An unresponsive person may need urgent emergency assistance. Contact the appropriate emergency service and follow dispatcher instructions.',
  },
  {
    id: 'serious-illness',
    icon: '🧠',
    title: 'Sudden serious illness',
    text:
      'Symptoms suggesting a serious medical emergency, including suspected stroke, require urgent professional assessment and emergency assistance.',
  },
] as const;

export default function FirstAidScreen() {
  const region = usePreparednessRegion();
  const { profile } = region;

  async function openSource(url: string) {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        'Unable to open link',
        'This source could not be opened on this device.'
      );
      return;
    }

    await Linking.openURL(url);
  }

  async function contactService(
    number: string,
    action: 'call' | 'sms'
  ) {
    const cleanNumber = number.replace(/[^\d+]/g, '');
    const url =
      action === 'sms'
        ? `sms:${cleanNumber}`
        : `tel:${cleanNumber}`;

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        action === 'sms'
          ? 'SMS unavailable'
          : 'Calling unavailable',
        'This action is not available on the current device or emulator.'
      );
      return;
    }

    await Linking.openURL(url);
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
            <Text style={styles.title}>First Aid</Text>
            <Text style={styles.subtitle}>
              Evidence-based first-aid information with links to
              authoritative guidance and local emergency services.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>➕</Text>
          </View>
        </View>

        <PreparednessRegionCard region={region} />

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyEyebrow}>
            LIFE-THREATENING EMERGENCY
          </Text>

          <Text style={styles.emergencyTitle}>
            Contact local emergency services
          </Text>

          <Text style={styles.emergencyText}>
            If someone is seriously ill, badly injured, unresponsive
            or in immediate danger, contact the appropriate emergency
            service for your current location and follow the operator's
            instructions.
          </Text>

          {profile.emergencyServices.length > 0 ? (
            <View style={styles.serviceList}>
              {profile.emergencyServices.map(service => (
                <View
                  key={service.id}
                  style={styles.serviceRow}
                >
                  <View style={styles.numberBox}>
                    <Text style={styles.numberText}>
                      {service.number}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>
                      {service.label}
                    </Text>
                    <Text style={styles.serviceAgency}>
                      {service.agency}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.callButton}
                    onPress={() =>
                      contactService(
                        service.number,
                        service.action
                      )
                    }
                  >
                    <Text style={styles.callButtonText}>
                      {service.action === 'sms'
                        ? 'SMS'
                        : 'Call'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noNumberCard}>
              <Text style={styles.noNumberTitle}>
                Local number not configured
              </Text>
              <Text style={styles.noNumberText}>
                Alerta Ready does not guess emergency numbers for
                unsupported regions. Confirm the correct number with
                your local emergency authority.
              </Text>
            </View>
          )}

          {profile.sources.length > 0 && (
            <View style={styles.regionalSourceRow}>
              {profile.sources.slice(0, 3).map(source => (
                <Pressable
                  key={source.url}
                  style={styles.regionalSourceButton}
                  onPress={() => openSource(source.url)}
                >
                  <Text style={styles.regionalSourceText}>
                    {source.label} ↗
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sourceSummaryCard}>
          <View style={styles.sourceSummaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceSummaryTitle}>
                Evidence source
              </Text>
              <Text style={styles.sourceSummaryText}>
                International Federation of Red Cross and Red Crescent
                Societies (IFRC) first-aid resources and the 2025
                International First Aid, Resuscitation and Education
                Guidelines.
              </Text>
            </View>

            <View style={styles.sourcedBadge}>
              <Text style={styles.sourcedBadgeText}>
                SOURCED
              </Text>
            </View>
          </View>

          <Text style={styles.reviewedText}>
            Information links reviewed {INFO_REVIEWED}.
          </Text>

          <View style={styles.sourceButtons}>
            <Pressable
              style={styles.sourceButton}
              onPress={() =>
                openSource(IFRC_FIRST_AID_SOURCE)
              }
            >
              <Text style={styles.sourceButtonText}>
                IFRC First Aid ↗
              </Text>
            </Pressable>

            <Pressable
              style={styles.sourceButton}
              onPress={() =>
                openSource(IFRC_GUIDELINES_SOURCE)
              }
            >
              <Text style={styles.sourceButtonText}>
                IFRC 2025 Guidelines ↗
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            First-aid topics
          </Text>
          <Text style={styles.sectionSubtitle}>
            These summaries are educational pointers, not a substitute
            for certified practical training or professional medical care.
          </Text>
        </View>

        <View style={styles.topicList}>
          {FIRST_AID_TOPICS.map(topic => (
            <View key={topic.id} style={styles.topicCard}>
              <View style={styles.topicIconBox}>
                <Text style={styles.topicIcon}>
                  {topic.icon}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.topicTitle}>
                  {topic.title}
                </Text>
                <Text style={styles.topicText}>
                  {topic.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.trainingCard}>
          <Text style={styles.trainingTitle}>
            Practical training matters
          </Text>
          <Text style={styles.trainingText}>
            Reading an app cannot replace hands-on first-aid and CPR
            training. The IFRC works through national Red Cross and Red
            Crescent societies around the world to provide first-aid
            education.
          </Text>

          <Pressable
            style={styles.trainingButton}
            onPress={() =>
              openSource(IFRC_FIRST_AID_SOURCE)
            }
          >
            <Text style={styles.trainingButtonText}>
              View IFRC First Aid Resources
            </Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>
            Safety note
          </Text>
          <Text style={styles.disclaimerText}>
            Alerta Ready provides preparedness information and links to
            authoritative sources. It does not diagnose medical
            conditions and does not replace emergency dispatchers,
            healthcare professionals or certified first-aid training.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  headerEmoji: {
    fontSize: 22,
  },
  emergencyCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 15,
    backgroundColor: '#7F1D1D',
  },
  emergencyEyebrow: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#FECACA',
  },
  emergencyTitle: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emergencyText: {
    marginTop: 5,
    fontSize: 9,
    lineHeight: 14,
    color: '#FEE2E2',
  },
  serviceList: {
    gap: 7,
    marginTop: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  numberBox: {
    minWidth: 48,
    minHeight: 39,
    paddingHorizontal: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
  },
  serviceTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#111827',
  },
  serviceAgency: {
    marginTop: 2,
    fontSize: 7,
    color: '#6B7280',
  },
  callButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  callButtonText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  noNumberCard: {
    marginTop: 11,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  noNumberTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#991B1B',
  },
  noNumberText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#7F1D1D',
  },
  regionalSourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  regionalSourceButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#991B1B',
  },
  regionalSourceText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FEE2E2',
  },
  sourceSummaryCard: {
    padding: 12,
    marginBottom: 18,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  sourceSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sourceSummaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
  },
  sourceSummaryText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#4B5563',
  },
  sourcedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  sourcedBadgeText: {
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#15803D',
  },
  reviewedText: {
    marginTop: 8,
    fontSize: 7,
    color: '#6B7280',
  },
  sourceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  sourceButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  sourceButtonText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#047857',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },
  topicList: {
    gap: 8,
    marginBottom: 17,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  topicIconBox: {
    width: 39,
    height: 39,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  topicIcon: {
    fontSize: 18,
  },
  topicTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  topicText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },
  trainingCard: {
    padding: 13,
    marginBottom: 12,
    borderRadius: 13,
    backgroundColor: '#0F2D26',
  },
  trainingTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trainingText: {
    marginTop: 4,
    fontSize: 8,
    lineHeight: 12,
    color: '#D1FAE5',
  },
  trainingButton: {
    minHeight: 39,
    marginTop: 11,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
  },
  trainingButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  disclaimerCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9A3412',
  },
  disclaimerText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#7C2D12',
  },
});
