import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUserProgress } from '../../hooks/use-UserProgress';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
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


function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const radius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return radius * c;
}

function getEonetMarkerColor(category: string) {
  const value = category.toLowerCase();

  if (value.includes('wildfire')) return '#F97316';
  if (value.includes('storm')) return '#2563EB';
  if (value.includes('volcano')) return '#7C3AED';
  if (value.includes('flood')) return '#0891B2';
  if (value.includes('landslide')) return '#92400E';
  if (value.includes('dust') || value.includes('haze')) return '#A16207';
  if (value.includes('drought')) return '#CA8A04';
  if (value.includes('ice')) return '#38BDF8';

  return '#F59E0B';
}

export default function DashboardScreen() {
  const { userData } = useUserProgress();
  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(userData.xp, userData.level);
  const [temperature, setTemperature] = useState('--');
  const [weatherText, setWeatherText] = useState('Loading...');
  const [riskLevel, setRiskLevel] = useState('Low Risk');

  // Shared live location/map snapshot used by the dashboard preview.
  // The Emergency Map uses the same device GPS + NASA EONET + USGS +
  // Tomorrow.io sources, so both screens show the same real-world area.
  const [dashboardLocation, setDashboardLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  const [locationLabel, setLocationLabel] =
    useState('Locating...');

  const [earthquakes, setEarthquakes] =
    useState<any[]>([]);

  const [disasterEvents, setDisasterEvents] =
    useState<any[]>([]);

  const [mapDataLoading, setMapDataLoading] =
    useState(true);

  // Refresh every time the Dashboard tab becomes active so it stays
  // aligned with the device/emulator location used by Emergency Map.
  useFocusEffect(
    useCallback(() => {
      syncDashboardWithEmergencyMap();
    }, [])
  );

  async function syncDashboardWithEmergencyMap() {
    setMapDataLoading(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setWeatherText('Location denied');
        setLocationLabel('Location unavailable');
        return;
      }

      let coords: Location.LocationObjectCoords;

      try {
        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        coords = currentLocation.coords;
      } catch (locationError) {
        // Same fallback used by the Emergency Map prototype.
        console.warn(
          'Dashboard GPS unavailable. Using Singapore demo location.'
        );

        coords = {
          latitude: 1.3521,
          longitude: 103.8198,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        };
      }

      setDashboardLocation(coords);

      await Promise.all([
        updateLocationLabel(
          coords.latitude,
          coords.longitude
        ),
        getWeatherForLocation(
          coords.latitude,
          coords.longitude
        ),
        getLiveHazards(),
      ]);
    } catch (error) {
      console.warn(
        'Dashboard map sync failed:',
        error
      );

      setWeatherText('Unavailable');
      setLocationLabel('Location unavailable');
    } finally {
      setMapDataLoading(false);
    }
  }

  async function updateLocationLabel(
    latitude: number,
    longitude: number
  ) {
    try {
      const places =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      const place = places[0];

      if (!place) {
        setLocationLabel(
          `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
        );
        return;
      }

      const primary =
        place.city ||
        place.subregion ||
        place.district ||
        place.name ||
        '';

      const secondary =
        place.region ||
        place.country ||
        '';

      const parts = [primary, secondary]
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        );

      setLocationLabel(
        parts.join(', ') ||
          `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      );
    } catch (error) {
      console.warn(
        'Reverse geocoding unavailable:',
        error
      );

      setLocationLabel(
        `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      );
    }
  }

  async function getWeatherForLocation(
    latitude: number,
    longitude: number
  ) {
    try {
      const response = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${latitude},${longitude}&apikey=${TOMORROW_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(
          `Tomorrow.io request failed: ${response.status}`
        );
      }

      const data = await response.json();
      const values = data?.data?.values ?? {};

      const temp = Math.round(
        values.temperature ?? 0
      );

      const weatherCode =
        values.weatherCode ?? 0;

      const rainIntensity =
        values.rainIntensity ?? 0;

      const precipitationProbability =
        values.precipitationProbability ?? 0;

      setTemperature(`${temp}°C`);
      setWeatherText(
        getWeatherDescription(weatherCode)
      );

      // Same prototype weather-risk thresholds as Emergency Map.
      if (
        rainIntensity >= 10 ||
        precipitationProbability >= 80
      ) {
        setRiskLevel('High Risk');
      } else if (
        rainIntensity >= 3 ||
        precipitationProbability >= 50
      ) {
        setRiskLevel('Moderate Risk');
      } else {
        setRiskLevel('Low Risk');
      }
    } catch (error) {
      console.warn(
        'Dashboard weather unavailable:',
        error
      );

      setWeatherText('Unavailable');
    }
  }

  async function getLiveHazards() {
    try {
      const [eonetResponse, usgsResponse] =
        await Promise.all([
          fetch(
            'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100'
          ),
          fetch(
            'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
          ),
        ]);

      if (eonetResponse.ok) {
        const eonetData =
          await eonetResponse.json();

        setDisasterEvents(
          eonetData.events ?? []
        );
      }

      if (usgsResponse.ok) {
        const usgsData =
          await usgsResponse.json();

        setEarthquakes(
          usgsData.features ?? []
        );
      }
    } catch (error) {
      console.warn(
        'Dashboard hazard data unavailable:',
        error
      );
    }
  }

  function getNearestEarthquake() {
    if (
      !dashboardLocation ||
      earthquakes.length === 0
    ) {
      return null;
    }

    const valid = earthquakes
      .map((earthquake) => {
        const coordinates =
          earthquake?.geometry?.coordinates;

        if (
          !Array.isArray(coordinates) ||
          coordinates.length < 2
        ) {
          return null;
        }

        const longitude = coordinates[0];
        const latitude = coordinates[1];

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number'
        ) {
          return null;
        }

        const distanceKm =
          getDistanceInMeters(
            dashboardLocation.latitude,
            dashboardLocation.longitude,
            latitude,
            longitude
          ) / 1000;

        return {
          id: earthquake.id,
          latitude,
          longitude,
          magnitude:
            earthquake?.properties?.mag ?? 0,
          place:
            earthquake?.properties?.place ??
            'Unknown location',
          distanceKm,
        };
      })
      .filter((item) => item !== null)
      .sort(
        (a, b) =>
          a!.distanceKm -
          b!.distanceKm
      );

    return valid[0] ?? null;
  }

  function getNearestEonetEvent() {
    if (
      !dashboardLocation ||
      disasterEvents.length === 0
    ) {
      return null;
    }

    const valid = disasterEvents
      .map((event) => {
        if (
          !event.geometry ||
          event.geometry.length === 0
        ) {
          return null;
        }

        const geometry =
          event.geometry[
            event.geometry.length - 1
          ];

        if (geometry.type !== 'Point') {
          return null;
        }

        const coordinates =
          geometry.coordinates;

        if (
          !Array.isArray(coordinates) ||
          coordinates.length < 2
        ) {
          return null;
        }

        const longitude = coordinates[0];
        const latitude = coordinates[1];

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number'
        ) {
          return null;
        }

        const distanceKm =
          getDistanceInMeters(
            dashboardLocation.latitude,
            dashboardLocation.longitude,
            latitude,
            longitude
          ) / 1000;

        return {
          id: event.id,
          title:
            event.title ??
            'Natural Event',
          category:
            event.categories?.[0]?.title ??
            'Natural Event',
          latitude,
          longitude,
          distanceKm,
        };
      })
      .filter((item) => item !== null)
      .sort(
        (a, b) =>
          a!.distanceKm -
          b!.distanceKm
      );

    return valid[0] ?? null;
  }

  const nearestEarthquake =
    getNearestEarthquake();

  const nearestEonetEvent =
    getNearestEonetEvent();

  const mapRegion = {
    latitude:
      dashboardLocation?.latitude ??
      1.3521,
    longitude:
      dashboardLocation?.longitude ??
      103.8198,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good morning, {userData.displayName} 👋</Text>
            <Text style={styles.subtitle}>Stay prepared. Stay safe.</Text>
            <Text style={styles.location} numberOfLines={1}>
              📍 {locationLabel}
            </Text>
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
            onPress={() =>
              router.push('/(tabs)/map' as any)
            }
          >
            <MapView
              style={styles.dashboardMap}
              pointerEvents="none"
              region={mapRegion}
              showsUserLocation={
                !!dashboardLocation
              }
              showsMyLocationButton={false}
            >
              {nearestEarthquake && (
                <Marker
                  coordinate={{
                    latitude:
                      nearestEarthquake.latitude,
                    longitude:
                      nearestEarthquake.longitude,
                  }}
                  title={`M${nearestEarthquake.magnitude} Earthquake`}
                  description={`${nearestEarthquake.distanceKm.toFixed(
                    0
                  )} km away • USGS`}
                  pinColor="purple"
                />
              )}

              {nearestEonetEvent && (
                <Marker
                  coordinate={{
                    latitude:
                      nearestEonetEvent.latitude,
                    longitude:
                      nearestEonetEvent.longitude,
                  }}
                  title={
                    nearestEonetEvent.title
                  }
                  description={`${nearestEonetEvent.category} • ${nearestEonetEvent.distanceKm.toFixed(
                    0
                  )} km away • NASA EONET`}
                  pinColor={getEonetMarkerColor(
                    nearestEonetEvent.category
                  )}
                />
              )}

              {riskLevel === 'High Risk' &&
                dashboardLocation && (
                  <Circle
                    center={{
                      latitude:
                        dashboardLocation.latitude,
                      longitude:
                        dashboardLocation.longitude,
                    }}
                    radius={5000}
                    strokeColor="rgba(239, 68, 68, 0.55)"
                    fillColor="rgba(239, 68, 68, 0.12)"
                  />
                )}
            </MapView>

            {mapDataLoading && (
              <View style={styles.mapLoadingBadge}>
                <Text style={styles.mapLoadingText}>
                  Syncing map…
                </Text>
              </View>
            )}
          </Pressable>

          <View style={styles.mapStatsRow}>
            <Text style={styles.mapStat}>
              🌋 {earthquakes.length} Quakes
            </Text>

            <Text style={styles.mapStat}>
              ⚠️ {disasterEvents.length} Events
            </Text>

            <Text style={styles.mapStat}>
              🌦️ {riskLevel}
            </Text>
          </View>

          <View style={styles.locationSyncCard}>
            <View style={styles.locationSyncIcon}>
              <Text style={styles.locationSyncEmoji}>
                📍
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={styles.locationSyncTitle}
                numberOfLines={1}
              >
                {locationLabel}
              </Text>

              <Text style={styles.locationSyncText}>
                Dashboard map is using the same device location and live hazard sources as Emergency Map.
              </Text>
            </View>

            <Pressable
              style={styles.locationSyncButton}
              onPress={() =>
                router.push('/(tabs)/map' as any)
              }
            >
              <Text
                style={styles.locationSyncButtonText}
              >
                Open
              </Text>
            </Pressable>
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

          <Activity
            icon={riskLevel === 'Low Risk' ? '✅' : '⚠️'}
            title={
              riskLevel === 'High Risk'
                ? `High weather risk near ${locationLabel}`
                : riskLevel === 'Moderate Risk'
                ? `Weather advisory near ${locationLabel}`
                : `No immediate weather risk near ${locationLabel}`
            }
            time="Live"
          />
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

  mapLoadingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  mapLoadingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
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

  locationSyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },

  locationSyncIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  locationSyncEmoji: {
    fontSize: 16,
  },

  locationSyncTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },

  locationSyncText: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    color: '#6B7280',
  },

  locationSyncButton: {
    minWidth: 48,
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
  },

  locationSyncButtonText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
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