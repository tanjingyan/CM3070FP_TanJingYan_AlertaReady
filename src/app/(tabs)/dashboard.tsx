import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Jing Yan 👋</Text>
            <Text style={styles.subtitle}>Stay prepared. Stay safe.</Text>
            <Text style={styles.location}>📍 Singapore</Text>
          </View>

          <View style={styles.weatherBox}>
            <Text style={styles.weatherIcon}>🌧️</Text>
            <Text style={styles.temp}>28°C</Text>
            <Text style={styles.weatherText}>Light Rain</Text>
          </View>
        </View>

        {/* Alert Card */}
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Flood Risk in Your Area</Text>
            <Text style={styles.alertText}>
              Heavy rainfall expected. Avoid low-lying areas near waterways.
            </Text>
          </View>

          <Text style={styles.riskText}>High Risk</Text>
        </View>

        {/* Preparedness */}
        <View style={styles.preparedCard}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>65%</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.preparedTitle}>Overall Preparedness</Text>

            <Text style={styles.preparedText}>
              Great job! Keep completing tasks to level up.
            </Text>

            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>

            <Text style={styles.xpText}>650 / 1000 XP</Text>
          </View>

          <Text style={styles.level}>Level 3</Text>
        </View>

        {/* Tasks + Map */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.sectionTitle}>Today's Priority Tasks</Text>

            <Task title="Build Emergency Kit" xp="+50 XP" />
            <Task title="Family Emergency Plan" xp="+40 XP" />
            <Task title="Know Your Route" xp="+30 XP" />
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.sectionTitle}>Nearby & Map</Text>

            <View style={styles.mapBox}>
              <Text>🗺️</Text>
              <Text>2 Shelters · 1 Hospital</Text>
            </View>
          </View>
        </View>

        {/* Resource Hub */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resource Hub</Text>

          <View style={styles.resourceRow}>
            <Resource icon="➕" text="First Aid" />
            <Resource icon="📞" text="Contacts" />
            <Resource icon="📘" text="Evacuation" />
            <Resource icon="📄" text="Documents" />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <Activity text="Flood warning issued for Singapore" />
          <Activity text="You completed 'Build Emergency Kit'" />
          <Activity text="New shelter added near your location" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Task({
  title,
  xp,
}: {
  title: string;
  xp: string;
}) {
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskIcon}>✅</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskSub}>
          Complete this preparedness task
        </Text>
      </View>

      <Text style={styles.xp}>{xp}</Text>
    </View>
  );
}

function Resource({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View style={styles.resourceItem}>
      <Text style={styles.resourceIcon}>{icon}</Text>
      <Text style={styles.resourceText}>{text}</Text>
    </View>
  );
}

function Activity({ text }: { text: string }) {
  return (
    <View style={styles.activityRow}>
      <Text>•</Text>
      <Text style={styles.activityText}>{text}</Text>
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
    backgroundColor: '#F8FAFC',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    color: '#6B7280',
    marginTop: 3,
  },

  location: {
    color: '#10B981',
    marginTop: 8,
    fontSize: 12,
  },

  weatherBox: {
    alignItems: 'center',
  },

  weatherIcon: {
    fontSize: 30,
  },

  temp: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  weatherText: {
    fontSize: 12,
    color: '#6B7280',
  },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },

  alertIcon: {
    fontSize: 30,
  },

  alertTitle: {
    fontWeight: 'bold',
    color: '#991B1B',
  },

  alertText: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 3,
  },

  riskText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 11,
  },

  preparedCard: {
    backgroundColor: '#079455',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },

  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  circleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },

  preparedTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  preparedText: {
    color: '#DCFCE7',
    fontSize: 12,
    marginVertical: 5,
  },

  progressBar: {
    height: 7,
    backgroundColor: '#34D399',
    borderRadius: 8,
  },

  progressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },

  xpText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 5,
  },

  level: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },

  smallCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    elevation: 2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },

  taskIcon: {
    fontSize: 16,
  },

  taskTitle: {
    fontWeight: '600',
    fontSize: 12,
  },

  taskSub: {
    color: '#6B7280',
    fontSize: 10,
  },

  xp: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 10,
  },

  mapBox: {
    height: 150,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  resourceItem: {
    alignItems: 'center',
    width: '24%',
  },

  resourceIcon: {
    fontSize: 24,
  },

  resourceText: {
    marginTop: 6,
    fontSize: 10,
    textAlign: 'center',
  },

  activityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  activityText: {
    color: '#374151',
    fontSize: 12,
  },
});