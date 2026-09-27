import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUserProgress } from '../../hooks/use-UserProgress';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

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

type RiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk';

type WeatherMetrics = {
  rain: number;
  precipitation: number;
  precipitationProbability: number;
  soilMoisture: number;
  windSpeed: number;
  windGusts: number;
  temperature: number;
  apparentTemperature: number;
};

const EMPTY_WEATHER_METRICS: WeatherMetrics = {
  rain: 0,
  precipitation: 0,
  precipitationProbability: 0,
  soilMoisture: 0,
  windSpeed: 0,
  windGusts: 0,
  temperature: 0,
  apparentTemperature: 0,
};

function getWeatherDescription(code: number) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Current Weather';
}

function getRainFloodRisk(
  rain: number,
  precipitation: number,
  precipitationProbability: number,
  soilMoisture: number
): RiskLevel {
  if (
    rain >= 10 ||
    precipitation >= 10 ||
    precipitationProbability >= 80 ||
    (soilMoisture >= 0.45 && precipitationProbability >= 60)
  ) {
    return 'High Risk';
  }

  if (
    rain >= 3 ||
    precipitation >= 3 ||
    precipitationProbability >= 50 ||
    (soilMoisture >= 0.35 && precipitationProbability >= 40)
  ) {
    return 'Moderate Risk';
  }

  return 'Low Risk';
}

function getWindRisk(
  windSpeed: number,
  windGusts: number
): RiskLevel {
  if (windSpeed >= 60 || windGusts >= 75) return 'High Risk';
  if (windSpeed >= 40 || windGusts >= 50) return 'Moderate Risk';
  return 'Low Risk';
}

function getTemperatureRisk(
  temperature: number,
  apparentTemperature: number
): RiskLevel {
  const hottest = Math.max(temperature, apparentTemperature);
  const coldest = Math.min(temperature, apparentTemperature);

  if (hottest >= 40 || coldest <= 0) return 'High Risk';
  if (hottest >= 35 || coldest <= 5) return 'Moderate Risk';
  return 'Low Risk';
}

function getOverallRisk(levels: RiskLevel[]): RiskLevel {
  if (levels.includes('High Risk')) return 'High Risk';
  if (levels.includes('Moderate Risk')) return 'Moderate Risk';
  return 'Low Risk';
}

function getRiskColors(level: RiskLevel) {
  if (level === 'High Risk') {
    return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
  }

  if (level === 'Moderate Risk') {
    return { bg: '#FEF3C7', text: '#A16207', border: '#FDE68A' };
  }

  return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
}

export default function DashboardScreen() {
  const { userData } = useUserProgress();
  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(userData.xp, userData.level);
  const [temperature, setTemperature] = useState('--');
  const [weatherText, setWeatherText] = useState('Loading...');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Low Risk');
  const [rainFloodRisk, setRainFloodRisk] = useState<RiskLevel>('Low Risk');
  const [windRisk, setWindRisk] = useState<RiskLevel>('Low Risk');
  const [temperatureRisk, setTemperatureRisk] = useState<RiskLevel>('Low Risk');
  const [weatherMetrics, setWeatherMetrics] =
    useState<WeatherMetrics>(EMPTY_WEATHER_METRICS);

  // Device location is used for the Dashboard's local weather context.
  const [dashboardLocation, setDashboardLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  const [locationLabel, setLocationLabel] =
    useState('Locating...');

  // Refresh every time the Dashboard tab becomes active so it stays
  // aligned with the device/emulator location used by Emergency Map.
  useFocusEffect(
    useCallback(() => {
      syncDashboardWithEmergencyMap();
    }, [])
  );

  async function syncDashboardWithEmergencyMap() {
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
      ]);
    } catch (error) {
      console.warn(
        'Dashboard map sync failed:',
        error
      );

      setWeatherText('Unavailable');
      setLocationLabel('Location unavailable');
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
      const weatherVariables = [
        'precipitation_probability',
        'rain',
        'precipitation',
        'soil_moisture_0_to_1cm',
        'wind_speed_10m',
        'wind_gusts_10m',
        'temperature_2m',
        'apparent_temperature',
      ].join(',');

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,apparent_temperature,weather_code` +
          `&hourly=${weatherVariables}&forecast_hours=1&wind_speed_unit=kmh&timezone=auto`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Open-Meteo request failed: ${response.status}`
        );
      }

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error('Open-Meteo returned an empty response.');
      }

      const data = JSON.parse(responseText);
      const hourly = data?.hourly ?? {};
      const current = data?.current ?? {};

      const metrics: WeatherMetrics = {
        rain: Number(hourly?.rain?.[0] ?? 0),
        precipitation: Number(hourly?.precipitation?.[0] ?? 0),
        precipitationProbability: Number(
          hourly?.precipitation_probability?.[0] ?? 0
        ),
        soilMoisture: Number(
          hourly?.soil_moisture_0_to_1cm?.[0] ?? 0
        ),
        windSpeed: Number(hourly?.wind_speed_10m?.[0] ?? 0),
        windGusts: Number(hourly?.wind_gusts_10m?.[0] ?? 0),
        temperature: Number(
          current?.temperature_2m ?? hourly?.temperature_2m?.[0] ?? 0
        ),
        apparentTemperature: Number(
          current?.apparent_temperature ??
            hourly?.apparent_temperature?.[0] ??
            0
        ),
      };

      const nextRainFloodRisk = getRainFloodRisk(
        metrics.rain,
        metrics.precipitation,
        metrics.precipitationProbability,
        metrics.soilMoisture
      );

      const nextWindRisk = getWindRisk(
        metrics.windSpeed,
        metrics.windGusts
      );

      const nextTemperatureRisk = getTemperatureRisk(
        metrics.temperature,
        metrics.apparentTemperature
      );

      const overall = getOverallRisk([
        nextRainFloodRisk,
        nextWindRisk,
        nextTemperatureRisk,
      ]);

      setWeatherMetrics(metrics);
      setRainFloodRisk(nextRainFloodRisk);
      setWindRisk(nextWindRisk);
      setTemperatureRisk(nextTemperatureRisk);
      setRiskLevel(overall);
      setTemperature(`${Math.round(metrics.temperature)}°C`);
      setWeatherText(
        getWeatherDescription(Number(current?.weather_code ?? -1))
      );

      console.log('Dashboard Open-Meteo weather context:', {
        metrics,
        rainFloodRisk: nextRainFloodRisk,
        windRisk: nextWindRisk,
        temperatureRisk: nextTemperatureRisk,
        overall,
      });
    } catch (error) {
      console.warn('Dashboard weather unavailable:', error);
      setWeatherText('Unavailable');
    }
  }

  const weatherRiskSummary =
    weatherText === 'Loading...'
      ? 'Checking rain, wind and temperature...'
      : weatherText === 'Unavailable' ||
        weatherText === 'Location denied'
        ? 'Weather context is currently unavailable.'
        : riskLevel === 'High Risk'
          ? 'One or more weather conditions need immediate attention.'
          : riskLevel === 'Moderate Risk'
            ? 'Some weather conditions may need extra caution.'
            : 'Rain, wind and temperature all low right now';

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

          <Pressable
            style={styles.weatherBox}
            onPress={() =>
              router.push('/(tabs)/map' as any)
            }
            accessibilityRole="button"
            accessibilityLabel="Open weather risk on map"
          >
            <Text style={styles.weatherIcon}>
              {weatherText.includes('Rain') ? '🌧️' :
              weatherText.includes('Cloud') ? '☁️' :
              weatherText === 'Clear' ? '☀️' : '🌤️'}
            </Text>

            <Text style={styles.temp}>
              {temperature}
            </Text>

            <Text style={styles.weatherText}>
              {weatherText}
            </Text>

            <View
              style={[
                styles.headerRiskBadge,
                {
                  backgroundColor:
                    getRiskColors(riskLevel).bg,
                },
              ]}
            >
              <View
                style={[
                  styles.headerRiskDot,
                  {
                    backgroundColor:
                      getRiskColors(riskLevel).text,
                  },
                ]}
              />

              <Text
                style={[
                  styles.headerRiskText,
                  {
                    color:
                      getRiskColors(riskLevel).text,
                  },
                ]}
              >
                {weatherText === 'Loading...'
                  ? 'Checking risk'
                  : weatherText === 'Unavailable' ||
                    weatherText === 'Location denied'
                    ? 'Risk unavailable'
                    : `${riskLevel.replace(' Risk', '')} risk`}
              </Text>
            </View>
          </Pressable>

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

          <Task
            title="Build Emergency Kit"
            xp="+50 XP"
            completed={userData.completedTasks.includes('Build Emergency Kit')}
          />
          <Task
            title="Family Emergency Plan"
            xp="+40 XP"
            completed={userData.completedTasks.includes('Family Emergency Plan')}
          />
          <Task
            title="Know Your Evacuation Route"
            xp="+30 XP"
            completed={userData.completedTasks.includes('Know Your Evacuation Route')}
          />

          <Pressable style={styles.viewTaskButton} onPress={() => router.push('/(tabs)/tasks' as any)}>
            <Text style={styles.viewTaskText}>View All Tasks ›</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Emergency Resources
              </Text>

              <Text style={styles.sectionSubtitleSmall}>
                Open a guide whenever you need it.
              </Text>
            </View>
          </View>

          <View style={styles.resourceGrid}>
            <ResourceCard
              icon="medkit-outline"
              title="First Aid"
              subtitle="Basic emergency care"
              route="/first-aid"
              iconBackground="#FEE2E2"
              iconColor="#DC2626"
            />

            <ResourceCard
              icon="call-outline"
              title="Contacts"
              subtitle="Emergency numbers"
              route="/contacts"
              iconBackground="#DBEAFE"
              iconColor="#2563EB"
            />

            <ResourceCard
              icon="navigate-outline"
              title="Evacuation"
              subtitle="Plans and safe routes"
              route="/evacuation"
              iconBackground="#FEF3C7"
              iconColor="#D97706"
            />

            <ResourceCard
              icon="document-text-outline"
              title="Documents"
              subtitle="Important records"
              route="/documents"
              iconBackground="#EDE9FE"
              iconColor="#7C3AED"
            />
          </View>
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

function ResourceCard({
  icon,
  title,
  subtitle,
  route,
  iconBackground,
  iconColor,
}: {
  icon: any;
  title: string;
  subtitle: string;
  route: string;
  iconBackground: string;
  iconColor: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resourceCard,
        pressed && styles.resourceCardPressed,
      ]}
      onPress={() => router.push(route as any)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.resourceCardTopRow}>
        <View
          style={[
            styles.resourceCardIconBox,
            { backgroundColor: iconBackground },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={iconColor}
          />
        </View>

        <View style={styles.resourceArrowBox}>
          <Ionicons
            name="chevron-forward"
            size={15}
            color="#94A3B8"
          />
        </View>
      </View>

      <Text
        style={styles.resourceCardTitle}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={styles.resourceCardSubtitle}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </Pressable>
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

  weatherBox: {
    minWidth: 84,
    alignItems: 'center',
  },

  weatherIcon: {
    fontSize: 28,
  },

  temp: {
    marginTop: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },

  weatherText: {
    marginTop: 1,
    fontSize: 11,
    color: '#6B7280',
  },

  headerRiskBadge: {
    marginTop: 6,
    minHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerRiskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  headerRiskText: {
    fontSize: 8,
    fontWeight: '900',
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

  sectionSubtitleSmall: {
    marginTop: -6,
    marginBottom: 10,
    fontSize: 10,
    lineHeight: 13,
    color: '#6B7280',
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


































  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  resourceCard: {
    width: '48.5%',
    minHeight: 112,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  resourceCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },

  resourceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  resourceCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resourceArrowBox: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  resourceCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },

  resourceCardSubtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    color: '#6B7280',
  },





  
});