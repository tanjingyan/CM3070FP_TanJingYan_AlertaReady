import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Alerts</Text>
            <Text style={styles.subtitle}>Current emergency updates</Text>
          </View>

          <View style={styles.filterCircle}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Text style={styles.activeTab}>Active</Text>
          <Text style={styles.inactiveTab}>History</Text>
        </View>

        <View style={styles.featuredAlert}>
          <View style={styles.alertTopRow}>
            <View style={styles.dangerIconCircle}>
              <Text style={styles.dangerIcon}>!</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.riskLabel}>High Risk</Text>
              <Text style={styles.featuredTitle}>Flood Risk in Your Area</Text>
              <Text style={styles.featuredText}>
                Heavy rainfall expected. Avoid low-lying areas near waterways.
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📍 Singapore</Text>
                <Text style={styles.metaText}>Updated 10 min ago</Text>
              </View>
            </View>

            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.outlineButton}
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <Text style={styles.outlineButtonText}>🗺️ View Map</Text>
            </Pressable>

            <Pressable style={styles.redButton}>
              <Text style={styles.redButtonText}>🛡️ Safety Steps</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Alerts</Text>

        <AlertCard
          icon="🌧️"
          risk="High Risk"
          title="Heavy Rainfall Warning"
          text="Very heavy rain expected in the next 6 hours."
          time="Updated 20 min ago"
          riskColor="#DC2626"
          bgColor="#FEE2E2"
        />

        <AlertCard
          icon="🌊"
          risk="Moderate Risk"
          title="River Water Level Rising"
          text="Water level is rising near low-lying areas."
          time="Updated 1 hour ago"
          riskColor="#EA580C"
          bgColor="#FFEDD5"
        />

        <AlertCard
          icon="💨"
          risk="Low Risk"
          title="Strong Winds Advisory"
          text="Strong winds expected. Secure loose objects."
          time="Updated 2 hours ago"
          riskColor="#CA8A04"
          bgColor="#FEF3C7"
        />

        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <Text style={styles.infoIcon}>🔔</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Stay Informed, Stay Safe</Text>
            <Text style={styles.infoText}>
              We will notify you about important alerts that may affect your area.
            </Text>
          </View>

          <Pressable style={styles.manageButton}>
            <Text style={styles.manageButtonText}>Manage Alerts</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <RecentAlert title="Flood warning issued for Singapore" time="Yesterday, 8:30 PM" />
        <RecentAlert title="Heavy rainfall warning ended" time="Yesterday, 2:15 PM" />
        <RecentAlert title="Strong winds advisory ended" time="May 24, 10:40 AM" />
      </ScrollView>
    </SafeAreaView>
  );
}

function AlertCard({
  icon,
  risk,
  title,
  text,
  time,
  riskColor,
  bgColor,
}: {
  icon: string;
  risk: string;
  title: string;
  text: string;
  time: string;
  riskColor: string;
  bgColor: string;
}) {
  return (
    <View style={styles.alertCard}>
      <View style={[styles.alertIconCircle, { backgroundColor: bgColor }]}>
        <Text style={styles.alertEmoji}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.cardRisk, { color: riskColor }]}>{risk}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
        <Text style={styles.cardTime}>🕒 {time}</Text>
      </View>

      <Text style={styles.cardChevron}>›</Text>
    </View>
  );
}

function RecentAlert({ title, time }: { title: string; time: string }) {
  return (
    <View style={styles.recentRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>✓</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.recentTitle}>{title}</Text>
        <Text style={styles.recentTime}>{time}</Text>
      </View>

      <Text style={styles.cardChevron}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  filterCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  filterIcon: {
    fontSize: 20,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 5,
    marginBottom: 16,
    elevation: 1,
  },

  activeTab: {
    flex: 1,
    textAlign: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    color: '#059669',
    fontWeight: 'bold',
  },

  inactiveTab: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
    color: '#6B7280',
    fontWeight: 'bold',
  },

  featuredAlert: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 20,
  },

  alertTopRow: {
    flexDirection: 'row',
    gap: 12,
  },

  dangerIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dangerIcon: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: 'bold',
  },

  riskLabel: {
    color: '#DC2626',
    fontWeight: 'bold',
    marginBottom: 4,
  },

  featuredTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
  },

  featuredText: {
    color: '#374151',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  metaText: {
    color: '#4B5563',
    fontSize: 11,
  },

  chevron: {
    fontSize: 34,
    color: '#374151',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },

  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  outlineButtonText: {
    color: '#991B1B',
    fontWeight: 'bold',
  },

  redButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  redButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    elevation: 2,
  },

  alertIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },

  alertEmoji: {
    fontSize: 26,
  },

  cardRisk: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },

  cardText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 3,
  },

  cardTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },

  cardChevron: {
    fontSize: 26,
    color: '#9CA3AF',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
    marginBottom: 18,
    gap: 12,
  },

  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoIcon: {
    fontSize: 22,
  },

  infoTitle: {
    color: '#047857',
    fontWeight: 'bold',
    fontSize: 14,
  },

  infoText: {
    color: '#065F46',
    fontSize: 11,
    marginTop: 3,
  },

  manageButton: {
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },

  manageButtonText: {
    color: '#047857',
    fontWeight: 'bold',
    fontSize: 11,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  viewAll: {
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 12,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    elevation: 1,
  },

  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },

  recentTitle: {
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 13,
  },

  recentTime: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
});