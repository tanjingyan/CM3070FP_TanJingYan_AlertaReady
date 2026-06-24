import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);

  const floodZone = {
    latitude: 1.3521,
    longitude: 103.8198,
  };

  const shelters = [
    {
      title: 'Community Shelter',
      latitude: 1.354,
      longitude: 103.821,
    },
    {
      title: 'National School Shelter',
      latitude: 1.35,
      longitude: 103.817,
    },
  ];

  const hospitals = [
    {
      title: 'Nearby Hospital',
      latitude: 1.348,
      longitude: 103.82,
    },
  ];

  useEffect(() => {
    getUserLocation();
  }, []);

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

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return radius * c;
  }

  async function getUserLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'Location permission is required for the map.'
      );
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation.coords);

    const distanceFromFloodZone = getDistanceInMeters(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      floodZone.latitude,
      floodZone.longitude
    );

    if (distanceFromFloodZone <= 500 && !alertTriggered) {
      setShowEmergencyAlert(true);
      setAlertTriggered(true);

      Alert.alert(
        '⚠️ Location-Based Flood Alert',
        'You are near a simulated flood risk area. Avoid low-lying areas and move to higher ground.'
      );
    }
  }

  function triggerFloodAlert() {
    setShowEmergencyAlert(true);

    Alert.alert(
      '⚠️ SIMULATED FLOOD ALERT',
      'Risk Level: High\n\n' +
        'Your current location is near a simulated flood-risk zone.\n\n' +
        'Recommended Actions:\n' +
        '• Move to higher ground\n' +
        '• Avoid flooded roads\n' +
        '• Prepare emergency supplies\n' +
        '• Follow official instructions\n\n' +
        'Nearest Shelter:\n' +
        '🏠 National School Shelter (2.1 km)\n\n' +
        'Emergency Contact:\n' +
        '📞 995',
      [
        {
          text: 'Dismiss',
          style: 'cancel',
        },
        {
          text: 'View Map',
          onPress: () => setShowEmergencyAlert(true),
        },
      ]
    );
  }

  function handleDirections() {
    Alert.alert(
      'Directions',
      'Route guidance to the nearest shelter will be added in the final version.'
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your location...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Map</Text>
        <Text style={styles.subtitle}>Location-based emergency prototype</Text>
      </View>

      {showEmergencyAlert && (
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyTitle}>
            ⚠️ Location-Based Flood Alert
          </Text>
          <Text style={styles.emergencyText}>
            Your current location is near a simulated flood-risk zone.
          </Text>
        </View>
      )}

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Your Location"
          description="Current GPS location"
          pinColor="blue"
        />

        <Marker
          coordinate={floodZone}
          title="Flood Risk Area"
          description="Tap to view simulated emergency alert"
          pinColor="orange"
          onPress={triggerFloodAlert}
        />

        <Circle
          center={floodZone}
          radius={500}
          strokeColor="rgba(239, 68, 68, 0.8)"
          fillColor="rgba(239, 68, 68, 0.2)"
        />

        {shelters.map((shelter, index) => (
          <Marker
            key={`shelter-${index}`}
            coordinate={{
              latitude: shelter.latitude,
              longitude: shelter.longitude,
            }}
            title={shelter.title}
            description="Simulated emergency shelter"
            pinColor="green"
          />
        ))}

        {hospitals.map((hospital, index) => (
          <Marker
            key={`hospital-${index}`}
            coordinate={{
              latitude: hospital.latitude,
              longitude: hospital.longitude,
            }}
            title={hospital.title}
            description="Simulated nearby hospital"
            pinColor="red"
          />
        ))}
      </MapView>

      <View style={styles.legendBar}>
        <Text style={styles.legendTitle}>Map Legend</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>Your Location</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Shelter</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Hospital</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>Risk Zone</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.alertRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>⚠️ Flood Risk Area</Text>
            <Text style={styles.alertText}>
              Simulated emergency zone near your current location.
            </Text>
          </View>

          <Text style={styles.riskText}>High Risk</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>🏠 2 Shelters</Text>
          <Text style={styles.stat}>🏥 1 Hospital</Text>
          <Text style={styles.stat}>⚠️ 1 Risk Zone</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.shelterRow}>
          <View style={styles.shelterIcon}>
            <Text style={styles.shelterEmoji}>🏠</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.shelterTitle}>National School Shelter</Text>
            <Text style={styles.shelterSub}>2.1 km away</Text>
            <Text style={styles.shelterSub}>Capacity: 500 people</Text>
          </View>

          <View style={styles.openBadge}>
            <Text style={styles.openText}>Open 24/7</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={triggerFloodAlert}>
            <Text style={styles.secondaryButtonText}>Trigger Alert</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleDirections}>
            <Text style={styles.buttonText}>📍 Get Directions</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  emergencyBanner: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  emergencyTitle: {
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 4,
  },

  emergencyText: {
    color: '#7F1D1D',
    fontSize: 12,
  },

  map: {
    flex: 1,
  },

  legendBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },

  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 7,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  alertTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 4,
  },

  alertText: {
    color: '#7F1D1D',
    fontSize: 13,
    marginBottom: 12,
  },

  riskText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 3,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  stat: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },

  shelterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  shelterIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  shelterEmoji: {
    fontSize: 22,
  },

  shelterTitle: {
    fontWeight: 'bold',
    color: '#111827',
  },

  shelterSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },

  openBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  openText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: 'bold',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#374151',
    fontWeight: 'bold',
  },

  button: {
    flex: 1.3,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});