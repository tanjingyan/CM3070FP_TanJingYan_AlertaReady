import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useUserProgress } from '../../hooks/use-UserProgress';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { TOMORROW_API_KEY } from '../../constants/api';

function getCurrentLevelXp(level: number) {
  if (level === 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 500;
  return 1000;
}

function getNextLevelXp(level: number) {
  if (level === 1) return 100;
  if (level === 2) return 250;
  if (level === 3) return 500;
  if (level === 4) return 1000;
  return 1000;
}

function getLevelProgress(xp: number, level: number) {
  const currentLevelXp = getCurrentLevelXp(level);
  const nextLevelXp = getNextLevelXp(level);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  return Math.min(Math.max(progress, 0), 100);
}

function getWeatherDescription(code: number) {
  switch (code) {
    case 1000:
      return 'Clear';
    case 1100:
      return 'Mostly Clear';
    case 1101:
      return 'Partly Cloudy';
    case 1001:
      return 'Cloudy';
    case 4000:
      return 'Drizzle';
    case 4200:
      return 'Light Rain';
    case 4201:
      return 'Heavy Rain';
    case 5000:
      return 'Snow';
    case 8000:
      return 'Thunderstorm';
    default:
      return 'Unknown';
  }
}

export default function DashboardScreen() {
  const { userData } = useUserProgress();
  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(userData.xp, userData.level);
  const [temperature, setTemperature] = useState('--');
  const [weatherText, setWeatherText] = useState('Loading...');
  const [riskLevel, setRiskLevel] = useState('Low Risk');
  
  useEffect(() => {
    getWeather();
  }, []);

  const getWeather = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setWeatherText('Location denied');
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      const response = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${latitude},${longitude}&apikey=${TOMORROW_API_KEY}`
      );

      const data = await response.json();

      const temp = Math.round(
        data.data.values.temperature
      );

      const weatherCode = data.data.values.weatherCode;
      const rain = data.data.values.rainIntensity ?? 0;

      setTemperature(`${temp}°C`);

      setWeatherText(getWeatherDescription(weatherCode));

      if (weatherCode === 4201 || rain > 10) {
        setRiskLevel('High Risk');
      }
      else if (
        weatherCode === 4200 ||
        weatherCode === 4000 ||
        rain > 0
      ) {
        setRiskLevel('Moderate Risk');
      }
      else {
        setRiskLevel('Low Risk');
      }
    } catch (error) {
      console.log(error);
      setWeatherText('Unavailable');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good morning, {userData.displayName} 👋</Text>
            <Text style={styles.subtitle}>Stay prepared. Stay safe.</Text>
            <Text style={styles.location}>📍 Singapore</Text>
          </View>

          <View style={styles.weatherBox}>
            <Text style={styles.weatherIcon}>
              {weatherText.includes('Rain') ? '🌧️' :
              weatherText.includes('Cloud') ? '☁️' :
              weatherText === 'Clear' ? '☀️' : '🌤️'}
            </Text>

            <Text style={styles.temp}>{temperature}</Text>

            <Text style={styles.weatherText}>
              {weatherText}
            </Text>
          </View>

        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {riskLevel === 'High Risk'
                ? 'Flood Risk in Your Area'
                : riskLevel === 'Moderate Risk'
                ? 'Weather Advisory'
                : 'No Immediate Risk'}
            </Text>

            <Text style={styles.alertText}>
              {riskLevel === 'High Risk'
                ? 'Heavy rainfall expected. Avoid low-lying areas near waterways.'
                : riskLevel === 'Moderate Risk'
                ? 'Light rainfall expected. Stay updated on weather conditions.'
                : 'No severe weather conditions detected in your area.'}
            </Text>

            <View style={styles.alertButtonRow}>
              <Pressable style={styles.alertSmallButton} onPress={() => router.push('/(tabs)/map' as any)}>
                <Text style={styles.alertSmallButtonText}>📍 View Map</Text>
              </Pressable>

              <Pressable style={styles.alertRedButton}>
                <Text style={styles.alertRedButtonText}>Safety Steps</Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={[
              styles.riskText,
              {
                color:
                  riskLevel === 'High Risk'
                    ? '#DC2626'
                    : riskLevel === 'Moderate Risk'
                    ? '#F59E0B'
                    : '#16A34A',
              },
            ]}
          >
            {riskLevel}
          </Text>
        </View>

        <View style={styles.preparedCard}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>{userData.preparedness}%</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.preparedTitle}>Overall Preparedness</Text>
            <Text style={styles.preparedText}>Keep completing tasks to level up.</Text>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
            </View>

            <Text style={styles.xpText}>
              {userData.xp} / {nextLevelXp} XP
            </Text>
          </View>

          <View style={styles.levelBox}>
            <Text style={styles.level}>Level {userData.level}</Text>
            <Text style={styles.badgeIcon}>🛡️</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Priority Tasks</Text>

            <Pressable onPress={() => router.push('/(tabs)/tasks' as any)}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          <Task title="Build Emergency Kit" xp="+50 XP" completed />
          <Task title="Family Emergency Plan" xp="+40 XP" />
          <Task title="Know Your Route" xp="+30 XP" />

          <Pressable style={styles.viewTaskButton} onPress={() => router.push('/(tabs)/tasks' as any)}>
            <Text style={styles.viewTaskText}>View All Tasks ›</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby & Map</Text>

            <Pressable onPress={() => router.push('/(tabs)/map' as any)}>
              <Text style={styles.viewAll}>Open Map</Text>
            </Pressable>
          </View>

          
          <Pressable
            style={styles.largeMapPreview}
            onPress={() => router.push('/(tabs)/map' as any)}
          >
            <MapView
              style={styles.dashboardMap}
              pointerEvents="none"
              initialRegion={{
                latitude: 1.3521,
                longitude: 103.8198,
                latitudeDelta: 0.018,
                longitudeDelta: 0.018,
              }}
            >
              <Marker
                coordinate={{ latitude: 1.3521, longitude: 103.8198 }}
                title="Your Location"
                pinColor="blue"
              />

              <Marker
                coordinate={{ latitude: 1.354, longitude: 103.821 }}
                title="Shelter"
                pinColor="green"
              />

              <Marker
                coordinate={{ latitude: 1.348, longitude: 103.82 }}
                title="Hospital"
                pinColor="red"
              />

              <Marker
                coordinate={{ latitude: 1.351, longitude: 103.824 }}
                title="Flood Risk Area"
                pinColor="orange"
              />

              <Circle
                center={{ latitude: 1.351, longitude: 103.824 }}
                radius={500}
                strokeColor="rgba(239, 68, 68, 0.6)"
                fillColor="rgba(239, 68, 68, 0.18)"
              />
            </MapView>
          </Pressable>

          <View style={styles.mapStatsRow}>
            <Text style={styles.mapStat}>🏠 2 Shelters</Text>
            <Text style={styles.mapStat}>🏥 1 Hospital</Text>
            <Text style={styles.mapStat}>⚠️ 1 Risk Zone</Text>
          </View>

          <View style={styles.shelterCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shelterTitle}>🏠 National School Shelter</Text>
              <Text style={styles.shelterDistance}>2.1 km away</Text>
              <Text style={styles.shelterCapacity}>Capacity: 500 people</Text>
            </View>

            <View style={styles.openButton}>
              <Text style={styles.openButtonText}>Open 24/7</Text>
            </View>
          </View>

          <View style={styles.riskInfoCard}>
            <Text style={styles.riskInfoTitle}>
              {riskLevel === 'High Risk'
                ? '⚠️ Flood Risk Area'
                : riskLevel === 'Moderate Risk'
                ? '🌧️ Weather Advisory'
                : '✅ Conditions Normal'}
            </Text>

            <Text style={styles.riskInfoText}>
              {riskLevel === 'High Risk'
                ? 'Heavy rainfall expected near your current location.'
                : riskLevel === 'Moderate Risk'
                ? 'Light rainfall expected near your current location.'
                : 'No immediate weather threats detected.'}
            </Text>
          </View>

          <Pressable style={styles.directionButton} onPress={() => router.push('/(tabs)/map' as any)}>
            <Text style={styles.directionText}>Get Directions ➤</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resource Hub</Text>
            <Text style={styles.viewAll}>View All</Text>
          </View>

          <View style={styles.resourceRow}>
            <Resource
              icon="➕"
              text="First Aid"
              route="/first-aid"
            />

            <Resource
              icon="📞"
              text="Contacts"
              route="/contacts"
            />

            <Resource
              icon="📘"
              text="Evacuation"
              route="/evacuation"
            />

            <Resource
              icon="📄"
              text="Documents"
              route="/documents"
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.viewAll}>View All</Text>
          </View>

          <Activity icon="⚠️" title="Flood warning issued for Singapore" time="Just now" />
          <Activity icon="✅" title={`${userData.completedTasks.length} tasks completed`} time="Today" />
          <Activity icon="🏠" title="New shelter added near your location" time="2 days ago" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
  
}

function Task({ title, xp, completed }: { title: string; xp: string; completed?: boolean }) {
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskCheck}>{completed ? '✅' : '○'}</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskSub}>Complete this preparedness task</Text>
      </View>

      <Text style={styles.xp}>{xp}</Text>
    </View>
  );
}

function Resource({icon, text, route }: { icon: string; text: string; route: string }) {
  return (
    <Pressable
      style={styles.resourceItem}
      onPress={() => router.push(route as any)}
    >
      <Text style={styles.resourceIcon}>{icon}</Text>
      <Text style={styles.resourceText}>{text}</Text>
    </Pressable>
  );
}

function Activity({ icon, title, time }: { icon: string; title: string; time: string }) {
  return (
    <View style={styles.activityRow}>
      <Text style={styles.activityIcon}>{icon}</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    alignItems: 'flex-start',
  },

  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    maxWidth: 250,
  },

  subtitle: {
    color: '#6B7280',
    marginTop: 3,
    fontSize: 13,
  },

  location: {
    color: '#10B981',
    marginTop: 8,
    fontSize: 12,
  },

  weatherBox: { alignItems: 'center' },
  weatherIcon: { fontSize: 28 },
  temp: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  weatherText: { fontSize: 11, color: '#6B7280' },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    gap: 10,
  },

  alertIcon: { fontSize: 32 },

  alertTitle: {
    fontWeight: 'bold',
    color: '#991B1B',
    fontSize: 13,
  },

  alertText: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 3,
  },

  alertButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  alertSmallButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  alertSmallButtonText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: 'bold',
  },

  alertRedButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  alertRedButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  riskText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 10,
  },

  preparedCard: {
    backgroundColor: '#079455',
    borderRadius: 18,
    padding: 17,
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
    fontSize: 15,
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
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },

  xpText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 5,
  },

  levelBox: { alignItems: 'center' },

  level: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  badgeIcon: {
    fontSize: 28,
    marginTop: 6,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    fontSize: 13,
  },

  viewAll: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 10,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  taskCheck: { fontSize: 14 },

  taskTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 12,
    color: '#111827',
  },

  taskSub: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 1,
  },

  xp: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 11,
  },

  viewTaskButton: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
  },

  viewTaskText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
  },

  largeMapPreview: {
  height: 140,
  backgroundColor: '#DCEEFF',
  borderRadius: 14,
  overflow: 'hidden',
  position: 'relative',
  marginBottom: 12,
  },

  fakeRiskZoneLarge: {
    position: 'absolute',
    width: 180,
    height: 220,
    borderRadius: 120,
    backgroundColor: '#F87171',
    opacity: 0.35,
    right: -40,
    top: -10,
  },


  mapMarker: {
    position: 'absolute',
    fontSize: 22,
  },

  mapStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  mapStat: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 'bold',
  },

  shelterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  shelterTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#111827',
  },

  shelterDistance: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },

  shelterCapacity: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },

  openButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  openButtonText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: 'bold',
  },

  riskInfoCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  riskInfoTitle: {
    color: '#991B1B',
    fontWeight: 'bold',
    fontSize: 12,
  },

  riskInfoText: {
    color: '#7F1D1D',
    fontSize: 11,
    marginTop: 3,
  },

  directionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  directionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  resourceItem: {
    alignItems: 'center',
    width: '24%',
  },

  resourceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  resourceIcon: { fontSize: 24 },

  resourceText: {
    marginTop: 6,
    fontSize: 10,
    textAlign: 'center',
    color: '#111827',
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  activityIcon: { fontSize: 18 },

  activityTitle: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },

  activityTime: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },

  arrow: {
    color: '#9CA3AF',
    fontSize: 20,
  },

  dashboardMap: {
  width: '100%',
  height: '100%',
  },
  
});