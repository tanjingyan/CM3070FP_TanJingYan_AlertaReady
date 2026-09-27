import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions';

import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '../../firebase/firebaseConfig';

import {
  disableRemoteAlerts,
  enableRemoteAlerts,
  refreshRemoteAlertLocation,
} from '../../services/pushNotifications';

type HazardAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  source: string;
  distanceKm?: number | null;
  createdAt?: { toDate?: () => Date } | null;
  read?: boolean;
  isTest?: boolean;
};

// Development-only FCM simulation control.
// Keep false for the final submitted app. Set true temporarily for the demo video.
const SHOW_DEVELOPMENT_TESTS = false;

export default function AlertsScreen() {
  const user = auth.currentUser;

  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const [alerts, setAlerts] = useState<HazardAlert[]>([]);

  const [loading, setLoading] = useState(true);

  const [changing, setChanging] = useState(false);

  const [sendingTest, setSendingTest] = useState(false);

  const visibleAlerts = useMemo(
    () =>
      SHOW_DEVELOPMENT_TESTS
        ? alerts
        : alerts.filter(item => item.isTest !== true),
    [alerts]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        setAlertsEnabled(
          snapshot.exists() &&
            snapshot.data().alertsEnabled === true
        );
      }
    );

    const alertsQuery = query(
      collection(db, 'users', user.uid, 'alerts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAlerts = onSnapshot(

      alertsQuery,
      snapshot => {

        const next = snapshot.docs.map(alertDoc => ({
          id: alertDoc.id,
          ...alertDoc.data(),
        })) as HazardAlert[];

        setAlerts(next);
        setLoading(false);
      },

      error => {
        console.warn('Load alerts error:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeAlerts();
    };

  }, [user?.uid]);

  const unreadCount = useMemo(
    () => visibleAlerts.filter(item => item.read !== true).length,
    [visibleAlerts]
  );

  async function toggleAlerts(nextValue: boolean) {

    if (!user) {
      Alert.alert('Login required', 'Please sign in again.');
      return;
    }

    try {
      setChanging(true);

      if (nextValue) {
        await enableRemoteAlerts();

        Alert.alert(
          'Real-time alerts enabled',
          'Alerta Ready can now send remote hazard notifications based on your last saved alert location.'
        );

      } else {

        await disableRemoteAlerts();

        Alert.alert(
          'Alerts disabled',
          'Remote hazard notifications have been turned off.'
        );
      }

    } catch (error: any) {

      Alert.alert(
        'Unable to update alerts',
        error?.message ?? 'Please try again.'
      );

    } finally {

      setChanging(false);
    }
  }

  async function refreshLocation() {

    try {

      setChanging(true);

      await refreshRemoteAlertLocation();

      Alert.alert(
        'Alert location updated',
        'Future hazard checks will use your current location.'
      );
      
    } catch (error: any) {

      Alert.alert(
        'Unable to update location',
        error?.message ?? 'Please try again.'
      );

    } finally {

      setChanging(false);
    }
  }

  async function sendTestHazard() {

    if (!alertsEnabled) {

      Alert.alert(
        'Enable alerts first',
        'Turn on Real-time hazard alerts before running the test.'
      );

      return;

    }

    Alert.alert(
      'Send test hazard?',
      'This sends a clearly labelled simulated hazard notification to your own device. It does not represent a real emergency.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Test',
          onPress: async () => {
            try {
            
              setSendingTest(true);

              const functions = getFunctions(
                undefined,
                'us-central1'
              );

              const callable = httpsCallable<
                void,
                { success: boolean }
              >(
                functions,
                'sendTestHazard'
              );

              const result = await callable();

              if (result.data.success) {

                Alert.alert(
                  'Test alert sent',
                  'A simulated hazard was sent through Firebase Cloud Messaging and should appear in Recent alerts.'
                );

              }

            } catch (error: any) {

              console.warn('Send test hazard error:', error);
              Alert.alert(
                'Test failed',
                error?.message ??
                  'Unable to send the test hazard.'
              );

            } finally {
              setSendingTest(false);
            }

          },

        },

      ]

    );

  }

  async function openAlert(item: HazardAlert) {

    if (user) {

      await setDoc(

        doc(db, 'users', user.uid, 'alerts', item.id),
        { read: true },
        { merge: true }
      );

    }

    if (item.isTest) {
      return;
    }

    router.push('/(tabs)/map' as any);

  }

  return (

    <SafeAreaView style={styles.safeArea}>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>

          <View style={{ flex: 1 }}>

            <Text style={styles.title}>Alerts</Text>

            <Text style={styles.subtitle}>
              Location-aware hazard notifications and recent alert history.
            </Text>

          </View>
          {unreadCount > 0 && (

            <View style={styles.unreadBadge}>

              <Text style={styles.unreadText}>
                {unreadCount}
              </Text>

            </View>
          )}

        </View>

        <View style={styles.settingsCard}>

          <View style={styles.settingsTop}>

            <View style={styles.bellIcon}>

              <Ionicons
                name="notifications-outline"
                size={22}
                color="#0A7A46"
              />

            </View>

            <View style={{ flex: 1 }}>

              <Text style={styles.settingsTitle}>
                Real-time hazard alerts
              </Text>

              <Text style={styles.settingsText}>
                Receive remote notifications when Alerta Ready detects a relevant hazard near your saved alert location.
              </Text>

            </View>

            <Switch
              value={alertsEnabled}
              disabled={changing}
              onValueChange={toggleAlerts}
            />

          </View>

          {alertsEnabled && (
            <Pressable
              style={styles.locationButton}
              disabled={changing}
              onPress={refreshLocation}
            >
              <Ionicons
                name="locate-outline"
                size={15}
                color="#0A7A46"
              />
              <Text style={styles.locationButtonText}>
                Refresh alert location
              </Text>
            </Pressable>

          )}

          {SHOW_DEVELOPMENT_TESTS && (

            <View style={styles.testArea}>

              <View style={styles.testLabelRow}>

                <Ionicons
                  name="flask-outline"
                  size={14}
                  color="#7C3AED"
                />

                <Text style={styles.testLabel}>
                  DEVELOPMENT TEST
                </Text>

              </View>

              <Pressable
                style={[
                  styles.testButton,
                  (!alertsEnabled || sendingTest) &&
                    styles.testButtonDisabled,
                ]}

                disabled={!alertsEnabled || sendingTest}
                onPress={sendTestHazard}
              >
                {sendingTest ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color="#FFFFFF"
                    />

                    <Text style={styles.testButtonText}>
                      Send Test Hazard
                    </Text>

                  </>
                )}

              </Pressable>
              <Text style={styles.testHelper}>
                Sends a clearly labelled simulation through the same Firebase Cloud Messaging pipeline. No real hazard is created.
              </Text>

            </View>
          )}

          <Text style={styles.safetyText}>
            Alerta Ready alerts are contextual indicators generated from monitored data sources. They are not official government warnings. Always follow local authorities.
          </Text>

        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent alerts
          </Text>

          <Text style={styles.sectionMeta}>
            {visibleAlerts.length}
          </Text>

        </View>
        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 30 }}
            color="#0A7A46"
          />
        ) : visibleAlerts.length === 0 ? (

          <View style={styles.emptyCard}>

            <Ionicons
              name="shield-checkmark-outline"
              size={34}
              color="#0A7A46"
            />

            <Text style={styles.emptyTitle}>
              No remote alerts yet
            </Text>

            <Text style={styles.emptyText}>
              When a monitored hazard meets Alerta Ready's proximity rules, the alert will appear here and can also be delivered as a push notification.
            </Text>

          </View>

        ) : (
          <View style={styles.alertList}>
            {visibleAlerts.map(item => {
              const date = item.createdAt?.toDate?.();
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.alertCard,
                    item.read !== true && styles.alertCardUnread,
                    item.isTest && styles.testAlertCard,
                  ]}
                  onPress={() => openAlert(item)}
                >
                  <View
                    style={[
                      styles.alertIcon,
                      item.isTest && styles.testAlertIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        item.isTest
                          ? 'flask-outline'
                          : 'warning-outline'
                      }
                      size={20}
                      color={
                        item.isTest
                          ? '#7C3AED'
                          : '#B45309'
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>

                    <View style={styles.alertTitleRow}>
                      <Text
                        style={styles.alertTitle}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>

                      {item.read !== true && (
                        <View style={styles.newDot} />
                      )}

                    </View>
                    {item.isTest && (

                      <Text style={styles.testBadge}>
                        SIMULATION
                      </Text>

                    )}
                    <Text style={styles.alertBody}>
                      {item.body}
                    </Text>

                    <Text style={styles.alertMeta}>
                      Source: {item.source}
                      {typeof item.distanceKm === 'number'
                        ? ` • ${item.distanceKm.toFixed(0)} km away`
                        : ''}
                    </Text>

                    {date && (

                      <Text style={styles.alertTime}>
                        {date.toLocaleString()}
                      </Text>
                    )}
                  </View>

                </Pressable>
              );

            })}

          </View>

        )}

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
    paddingTop: 12,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: '#6B7280',
  },

  unreadBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  unreadText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#166534',
  },

  settingsCard: {
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 22,
  },

  settingsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bellIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  settingsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  settingsText: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: '#6B7280',
  },

  locationButton: {
    marginTop: 13,
    minHeight: 38,
    borderRadius: 9,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  locationButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0A7A46',
  },

  testArea: {
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#EEE9FE',
  },

  testLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 7,
  },

  testLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#7C3AED',
  },

  testButton: {
    minHeight: 40,
    borderRadius: 9,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },

  testButtonDisabled: {
    opacity: 0.45,
  },

  testButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  testHelper: {
    marginTop: 6,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#8B7AB8',
  },

  safetyText: {
    marginTop: 11,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#9CA3AF',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  sectionMeta: {
    fontSize: 9,
    color: '#6B7280',
  },

  emptyCard: {
    padding: 28,
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  emptyText: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 8.5,
    lineHeight: 13,
    color: '#6B7280',
  },

  alertList: {
    gap: 9,
  },

  alertCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  alertCardUnread: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },

  testAlertCard: {
    borderColor: '#DDD6FE',
  },

  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
  },

  testAlertIcon: {
    backgroundColor: '#F5F3FF',
  },

  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  alertTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },

  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },

  testBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EDE9FE',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#6D28D9',
  },

  alertBody: {
    marginTop: 4,
    fontSize: 8.5,
    lineHeight: 13,
    color: '#4B5563',
  },

  alertMeta: {
    marginTop: 6,
    fontSize: 7.5,
    color: '#6B7280',
  },

  alertTime: {
    marginTop: 3,
    fontSize: 7,
    color: '#9CA3AF',
  },

});
