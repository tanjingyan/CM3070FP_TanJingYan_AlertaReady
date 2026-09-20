import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  TOMORROW_API_KEY,
  GOOGLE_PLACES_API_KEY,
} from '../../constants/api';

export default function MapScreen() {
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  const [showEmergencyAlert, setShowEmergencyAlert] =
    useState(false);

  const [riskLevel, setRiskLevel] =
    useState('Low Risk');

  const [shelters, setShelters] =
    useState<any[]>([]);

  const [hospitals, setHospitals] =
    useState<any[]>([]);

  // NASA EONET real natural events
  const [disasterEvents, setDisasterEvents] =
    useState<any[]>([]);

  // USGS real earthquakes
  const [earthquakes, setEarthquakes] =
    useState<any[]>([]);

  // Map marker filters
  const [mapFilters, setMapFilters] = useState({
    shelters: true,
    hospitals: true,
    earthquakes: true,
    wildfires: true,
    severeStorms: true,
    volcanoes: true,
    floods: true,
    landslides: true,
    dustHaze: true,
    drought: true,
    ice: true,
    otherNatural: true,
    weather: true,
  });

  // Filter-sheet UI state.
  // pendingFilters only becomes active after the user presses Apply.
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(mapFilters);

  type MapFilter =
    | 'shelters'
    | 'hospitals'
    | 'earthquakes'
    | 'wildfires'
    | 'severeStorms'
    | 'volcanoes'
    | 'floods'
    | 'landslides'
    | 'dustHaze'
    | 'drought'
    | 'ice'
    | 'otherNatural'
    | 'weather';

  function toggleMapFilter(filter: MapFilter) {
    setMapFilters((previous) => ({
      ...previous,
      [filter]: !previous[filter],
    }));
  }

  function openFilterSheet() {
    setPendingFilters({ ...mapFilters });
    setFilterModalVisible(true);
  }

  function togglePendingFilter(filter: MapFilter) {
    setPendingFilters((previous) => ({
      ...previous,
      [filter]: !previous[filter],
    }));
  }

  function resetPendingFilters() {
    setPendingFilters({
      shelters: true,
      hospitals: true,
      earthquakes: true,
      wildfires: true,
      severeStorms: true,
      volcanoes: true,
      floods: true,
      landslides: true,
      dustHaze: true,
      drought: true,
      ice: true,
      otherNatural: true,
      weather: true,
    });
  }

  function applyPendingFilters() {
    setMapFilters({ ...pendingFilters });
    setFilterModalVisible(false);
  }

  function getEonetFilterKey(category: string): MapFilter {
    const c = category.toLowerCase();
    if (c.includes('wildfire')) return 'wildfires';
    if (c.includes('severe storm') || c.includes('storm')) return 'severeStorms';
    if (c.includes('volcano')) return 'volcanoes';
    if (c.includes('flood')) return 'floods';
    if (c.includes('landslide')) return 'landslides';
    if (c.includes('dust') || c.includes('haze') || c.includes('smoke')) return 'dustHaze';
    if (c.includes('drought')) return 'drought';
    if (c.includes('sea and lake ice') || c.includes('ice')) return 'ice';
    return 'otherNatural';
  }

  function getEonetMarkerColor(category: string) {
    switch (getEonetFilterKey(category)) {
      case 'wildfires': return '#F97316';
      case 'severeStorms': return '#2563EB';
      case 'volcanoes': return '#7C3AED';
      case 'floods': return '#0891B2';
      case 'landslides': return '#92400E';
      case 'dustHaze': return '#A16207';
      case 'drought': return '#CA8A04';
      case 'ice': return '#38BDF8';
      default: return '#6B7280';
    }
  }

  function getNaturalEventSummaryTitle(category: string) {
    switch (getEonetFilterKey(category)) {
      case 'wildfires':
        return 'Wildfire event';
      case 'severeStorms':
        return 'Storm event';
      case 'volcanoes':
        return 'Volcano event';
      case 'floods':
        return 'Flood event';
      case 'landslides':
        return 'Landslide event';
      case 'dustHaze':
        return 'Dust / haze event';
      case 'drought':
        return 'Drought event';
      case 'ice':
        return 'Ice event';
      default:
        return 'Natural event';
    }
  }

  function getNaturalEventSummaryIcon(category: string) {
    switch (getEonetFilterKey(category)) {
      case 'wildfires':
        return '🔥';
      case 'severeStorms':
        return '🌪️';
      case 'volcanoes':
        return '🌋';
      case 'floods':
        return '🌊';
      case 'landslides':
        return '⛰️';
      case 'dustHaze':
        return '🌫️';
      case 'drought':
        return '🏜️';
      case 'ice':
        return '🧊';
      default:
        return '⚠️';
    }
  }

  // ---------------------------------------------------------
  // GOOGLE PLACES HOSPITAL VALIDATION
  // ---------------------------------------------------------
  // Google Places can occasionally return a place that is
  // incorrectly categorised as a hospital. This keeps genuine
  // hospital results while removing obvious non-medical
  // businesses such as software/web-development companies.
  function isLikelyHospital(place: any) {
    const name = String(place?.name ?? '').toLowerCase();

    const types = Array.isArray(place?.types)
      ? place.types.map((type: string) => type.toLowerCase())
      : [];

    const businessStatus = String(
      place?.business_status ?? ''
    ).toUpperCase();

    // Because the request is for type=hospital, require Google
    // to also classify the returned place as a hospital.
    if (!types.includes('hospital')) {
      return false;
    }

    // Ignore permanently/temporarily closed results when Google
    // supplies business_status.
    if (
      businessStatus &&
      businessStatus !== 'OPERATIONAL'
    ) {
      return false;
    }

    const suspiciousNonMedicalKeywords = [
      'website development',
      'web development',
      'mobile application',
      'app development',
      'software development',
      'software company',
      'software solution',
      'digital marketing',
      'web design',
      'graphic design',
      'seo service',
      'it service',
      'computer service',
      'computer repair',
    ];

    const looksLikeObviousNonMedicalBusiness =
      suspiciousNonMedicalKeywords.some((keyword) =>
        name.includes(keyword)
      );

    return !looksLikeObviousNonMedicalBusiness;
  }

  const eonetCategoryCounts = disasterEvents.reduce(
    (counts, event) => {
      const category = event.categories?.[0]?.title ?? 'Natural Event';
      const key = getEonetFilterKey(category);
      if (key in counts) (counts as any)[key] += 1;
      return counts;
    },
    { wildfires: 0, severeStorms: 0, volcanoes: 0, floods: 0,
      landslides: 0, dustHaze: 0, drought: 0, ice: 0, otherNatural: 0 }
  );

  const filterOptions: Array<{
    key: MapFilter;
    label: string;
    icon: string;
    count: number | string;
  }> = [
    { key: 'wildfires', label: 'Wildfires', icon: '🔥', count: eonetCategoryCounts.wildfires },
    { key: 'severeStorms', label: 'Storms', icon: '🌪️', count: eonetCategoryCounts.severeStorms },
    { key: 'volcanoes', label: 'Volcanoes', icon: '🌋', count: eonetCategoryCounts.volcanoes },
    { key: 'floods', label: 'Floods', icon: '🌊', count: eonetCategoryCounts.floods },
    { key: 'earthquakes', label: 'Earthquakes', icon: '🌋', count: earthquakes.length },
    { key: 'weather', label: 'Weather', icon: '🌦️', count: riskLevel },
    { key: 'landslides', label: 'Landslides', icon: '⛰️', count: eonetCategoryCounts.landslides },
    { key: 'dustHaze', label: 'Dust / Haze', icon: '🌫️', count: eonetCategoryCounts.dustHaze },
    { key: 'drought', label: 'Drought', icon: '🏜️', count: eonetCategoryCounts.drought },
    { key: 'ice', label: 'Ice', icon: '🧊', count: eonetCategoryCounts.ice },
    { key: 'otherNatural', label: 'Other natural events', icon: '⚠️', count: eonetCategoryCounts.otherNatural },
    { key: 'shelters', label: 'Shelters', icon: '🏠', count: shelters.length },
    { key: 'hospitals', label: 'Hospitals', icon: '🏥', count: hospitals.length },
  ];

  useEffect(() => {
    getUserLocation();
    getDisasterEvents();
    getEarthquakes();
  }, []);

  // ---------------------------------------------------------
  // DISTANCE CALCULATION
  // ---------------------------------------------------------

  function getDistanceInMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const radius = 6371000;

    const dLat =
      ((lat2 - lat1) * Math.PI) / 180;

    const dLon =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
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

  // ---------------------------------------------------------
  // NEAREST HAZARD CALCULATIONS
  // ---------------------------------------------------------

  function getNearestEarthquake() {
    if (!location || earthquakes.length === 0) {
      return null;
    }

    const validEarthquakes = earthquakes
      .map((earthquake) => {
        const coordinates = earthquake?.geometry?.coordinates;

        if (!Array.isArray(coordinates) || coordinates.length < 3) {
          return null;
        }

        const longitude = coordinates[0];
        const latitude = coordinates[1];
        const depth = coordinates[2];

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return null;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          ) / 1000;

        return {
          id: earthquake.id,
          magnitude: earthquake?.properties?.mag ?? 0,
          place: earthquake?.properties?.place ?? 'Unknown location',
          time: earthquake?.properties?.time ?? null,
          depth: typeof depth === 'number' ? depth : null,
          latitude,
          longitude,
          distanceKm,
        };
      })
      .filter((earthquake) => earthquake !== null);

    if (validEarthquakes.length === 0) {
      return null;
    }

    validEarthquakes.sort((a, b) => a!.distanceKm - b!.distanceKm);
    return validEarthquakes[0];
  }

  function getNearestEonetEvent() {
    if (!location || disasterEvents.length === 0) {
      return null;
    }

    const validEvents = disasterEvents
      .map((event) => {
        if (!event.geometry || event.geometry.length === 0) {
          return null;
        }

        const geometry = event.geometry[event.geometry.length - 1];

        if (geometry.type !== 'Point') {
          return null;
        }

        const coordinates = geometry.coordinates;

        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          return null;
        }

        const longitude = coordinates[0];
        const latitude = coordinates[1];

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return null;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          ) / 1000;

        return {
          id: event.id,
          title: event.title ?? 'Natural Event',
          category: event.categories?.[0]?.title ?? 'Natural Event',
          latitude,
          longitude,
          distanceKm,
        };
      })
      .filter((event) => event !== null);

    if (validEvents.length === 0) {
      return null;
    }

    validEvents.sort((a, b) => a!.distanceKm - b!.distanceKm);
    return validEvents[0];
  }

  // ---------------------------------------------------------
  // NASA EONET
  // Real currently open natural events
  // ---------------------------------------------------------

  async function getDisasterEvents() {
    try {
      const response = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100'
      );

      if (!response.ok) {
        throw new Error(
          `NASA EONET request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log('NASA EONET events:');
      console.log(data.events);

      setDisasterEvents(
        data.events ?? []
      );
    } catch (error) {
      console.error(
        'Error fetching NASA EONET disaster events:',
        error
      );
    }
  }

  // ---------------------------------------------------------
  // USGS EARTHQUAKES
  // Real M2.5+ earthquakes from the past 24 hours
  // ---------------------------------------------------------

  async function getEarthquakes() {
    try {
      const response = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
      );

      if (!response.ok) {
        throw new Error(
          `USGS request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log('USGS earthquakes:');
      console.log(data.features);

      setEarthquakes(
        data.features ?? []
      );
    } catch (error) {
      console.error(
        'Error fetching USGS earthquakes:',
        error
      );
    }
  }

  // ---------------------------------------------------------
  // USER LOCATION + GOOGLE PLACES + TOMORROW.IO
  // ---------------------------------------------------------

  async function getUserLocation() {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'Location permission is required for the map.'
      );

      return;
    }

    try {
      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        });

      setLocation(
        currentLocation.coords
      );

      // -----------------------------------------------------
      // GOOGLE PLACES - HOSPITALS
      // -----------------------------------------------------

      try {
        const hospitalResponse =
          await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&radius=5000&type=hospital&key=${GOOGLE_PLACES_API_KEY}`
          );

        const hospitalData =
          await hospitalResponse.json();

        console.log(
          'Hospital results:'
        );

        console.log(
          hospitalData.results
        );

        const rawHospitalResults =
          hospitalData.results ?? [];

        const filteredHospitals =
          rawHospitalResults.filter(
            (place: any) =>
              isLikelyHospital(place)
          );

        const removedHospitalResults =
          rawHospitalResults.filter(
            (place: any) =>
              !isLikelyHospital(place)
          );

        if (removedHospitalResults.length > 0) {
          console.log(
            'Filtered suspicious hospital results:',
            removedHospitalResults.map(
              (place: any) => place?.name
            )
          );
        }

        console.log(
          'Validated hospital results:',
          filteredHospitals
        );

        setHospitals(
          filteredHospitals
        );
      } catch (error) {
        console.error(
          'Hospital API error:',
          error
        );
      }

      // -----------------------------------------------------
      // GOOGLE PLACES - PROTOTYPE SHELTER LOCATIONS
      //
      // Google Places does not provide an emergency-shelter
      // place type here, so schools are being used only as
      // prototype shelter locations.
      // -----------------------------------------------------

      try {
        const shelterResponse =
          await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&radius=5000&type=school&key=${GOOGLE_PLACES_API_KEY}`
          );

        const shelterData =
          await shelterResponse.json();

        console.log(
          'Prototype shelter results:'
        );

        console.log(
          shelterData.results
        );

        setShelters(
          shelterData.results ?? []
        );
      } catch (error) {
        console.error(
          'Shelter API error:',
          error
        );
      }

      // -----------------------------------------------------
      // TOMORROW.IO LIVE WEATHER
      // -----------------------------------------------------

      try {
        const response =
          await fetch(
            `https://api.tomorrow.io/v4/weather/realtime?location=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&apikey=${TOMORROW_API_KEY}`
          );

        if (!response.ok) {
          throw new Error(
            `Tomorrow.io request failed: ${response.status}`
          );
        }

        const data =
          await response.json();

        console.log(
          'Tomorrow API response:'
        );

        console.log(
          data?.data?.values
        );

        const rainIntensity =
          data?.data?.values
            ?.rainIntensity ?? 0;

        const precipitationProbability =
          data?.data?.values
            ?.precipitationProbability ??
          0;

        console.log(
          'Rain intensity:',
          rainIntensity
        );

        console.log(
          'Precipitation probability:',
          precipitationProbability
        );

        // Prototype weather-risk classification.
        // This is NOT an official flood warning.

        if (
          rainIntensity >= 10 ||
          precipitationProbability >=
            80
        ) {
          setRiskLevel(
            'High Risk'
          );

          setShowEmergencyAlert(
            true
          );

          Alert.alert(
            '⚠️ Severe Weather Alert',
            'Heavy rainfall conditions were detected near your current location. This is a weather-based risk estimate and not an official flood warning.'
          );
        } else if (
          rainIntensity >= 3 ||
          precipitationProbability >=
            50
        ) {
          setRiskLevel(
            'Moderate Risk'
          );
        } else {
          setRiskLevel(
            'Low Risk'
          );
        }
      } catch (error) {
        console.error(
          'Tomorrow.io error:',
          error
        );
      }
    } catch (error) {
      console.error(
        'Location error:',
        error
      );

      const fallbackLocation = {
        latitude: 1.3521,
        longitude: 103.8198,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };

      setLocation(
        fallbackLocation
      );

      Alert.alert(
        'Demo Location Used',
        'Current GPS location is unavailable, so the app is using a simulated Singapore location for the prototype demo.'
      );
    }
  }

  // ---------------------------------------------------------
  // SIMULATED DEMO ALERT
  // ---------------------------------------------------------

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
        'Emergency Contact:\n' +
        '📞 995',
      [
        {
          text: 'Dismiss',
          style: 'cancel',
        },
        {
          text: 'View Map',
          onPress: () =>
            setShowEmergencyAlert(
              true
            ),
        },
      ]
    );
  }

  // ---------------------------------------------------------
  // DIRECTIONS
  // ---------------------------------------------------------

  async function handleDirections(place: any, placeType: 'shelter' | 'hospital') {
    const latitude = place?.geometry?.location?.lat;
    const longitude = place?.geometry?.location?.lng;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      Alert.alert(
        'Directions unavailable',
        `The selected ${placeType} does not have a valid map location.`
      );
      return;
    }

    const label = encodeURIComponent(
      place?.name ?? (placeType === 'shelter' ? 'Prototype Shelter' : 'Hospital')
    );

    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${latitude},${longitude}` +
      `&destination_place_id=${place?.place_id ?? ''}` +
      `&travelmode=driving`;

    try {
      const supported = await Linking.canOpenURL(googleMapsUrl);

      if (!supported) {
        Alert.alert(
          'Directions unavailable',
          `Unable to open directions to ${decodeURIComponent(label)}.`
        );
        return;
      }

      await Linking.openURL(googleMapsUrl);
    } catch (error) {
      console.error('Directions error:', error);
      Alert.alert(
        'Directions unavailable',
        'Google Maps directions could not be opened.'
      );
    }
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (!location) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.loadingText
          }
        >
          Loading your location...
        </Text>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------
  // NEAREST HAZARDS
  // ---------------------------------------------------------

  const nearestEarthquake = getNearestEarthquake();
  const nearestEonetEvent = getNearestEonetEvent();

  // ---------------------------------------------------------
  // ACTIVE HAZARD RULES (prototype / app-defined)
  // These are proximity/relevance rules, NOT official warning zones.
  // ---------------------------------------------------------

  const EONET_NEARBY_KM = 50;

  const nearbyEonetHazard =
    nearestEonetEvent && nearestEonetEvent.distanceKm <= EONET_NEARBY_KM
      ? nearestEonetEvent
      : null;

  // Earthquake relevance uses both magnitude and distance.
  // This is a prototype relevance rule, not an official USGS warning rule.
  const nearbyEarthquakeHazard =
    nearestEarthquake &&
    ((nearestEarthquake.magnitude >= 5 && nearestEarthquake.distanceKm <= 300) ||
      (nearestEarthquake.magnitude >= 4 && nearestEarthquake.distanceKm <= 100) ||
      (nearestEarthquake.magnitude >= 2.5 && nearestEarthquake.distanceKm <= 30))
      ? nearestEarthquake
      : null;

  const hasWeatherHazard = riskLevel === 'High Risk';

  const activeHazard = nearbyEonetHazard
    ? {
        type: 'Natural Event',
        title: nearbyEonetHazard.title,
        detail: `${nearbyEonetHazard.category} detected ${nearbyEonetHazard.distanceKm.toFixed(0)} km away`,
        latitude: nearbyEonetHazard.latitude,
        longitude: nearbyEonetHazard.longitude,
        source: 'NASA EONET',
      }
    : nearbyEarthquakeHazard
      ? {
          type: 'Earthquake',
          title: `M${nearbyEarthquakeHazard.magnitude} Earthquake`,
          detail: `${nearbyEarthquakeHazard.place} • ${nearbyEarthquakeHazard.distanceKm.toFixed(0)} km away`,
          latitude: nearbyEarthquakeHazard.latitude,
          longitude: nearbyEarthquakeHazard.longitude,
          source: 'USGS',
        }
      : hasWeatherHazard
        ? {
            type: 'Severe Weather',
            title: 'Severe weather risk detected',
            detail: 'Heavy rainfall conditions detected near your current location',
            latitude: location.latitude,
            longitude: location.longitude,
            source: 'Tomorrow.io',
          }
        : null;

  const nearestShelter = shelters
    .map((place) => {
      const latitude = place?.geometry?.location?.lat;
      const longitude = place?.geometry?.location?.lng;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      return {
        ...place,
        distanceKm:
          getDistanceInMeters(location.latitude, location.longitude, latitude, longitude) / 1000,
      };
    })
    .filter((place) => place !== null)
    .sort((a, b) => a!.distanceKm - b!.distanceKm)[0] ?? null;

  const nearestHospital = hospitals
    .map((place) => {
      const latitude = place?.geometry?.location?.lat;
      const longitude = place?.geometry?.location?.lng;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      return {
        ...place,
        distanceKm:
          getDistanceInMeters(location.latitude, location.longitude, latitude, longitude) / 1000,
      };
    })
    .filter((place) => place !== null)
    .sort((a, b) => a!.distanceKm - b!.distanceKm)[0] ?? null;

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Compact header inspired by the cleaner prototype layout */}
      <View style={styles.compactHeader}>
        <View>
          <Text style={styles.title}>Emergency Map</Text>
          <Text style={styles.subtitle}>Live hazard information near you</Text>
        </View>

        <View style={styles.liveHeaderBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveHeaderText}>Live</Text>
        </View>
      </View>

      <View style={styles.mapArea}>
        <MapView
        style={styles.map}
        initialRegion={{
          latitude:
            location.latitude,
          longitude:
            location.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* ------------------------------------------------ */}
        {/* USER LOCATION                                    */}
        {/* ------------------------------------------------ */}

        <Marker
          coordinate={{
            latitude:
              location.latitude,
            longitude:
              location.longitude,
          }}
          title="Your Location"
          description="Current GPS location"
          pinColor="blue"
        />

        {/* ------------------------------------------------ */}
        {/* PROTOTYPE SHELTER LOCATIONS                      */}
        {/* ------------------------------------------------ */}

        {mapFilters.shelters &&
          shelters.map(
          (shelter, index) => {
            const latitude =
              shelter?.geometry
                ?.location?.lat;

            const longitude =
              shelter?.geometry
                ?.location?.lng;

            if (
              typeof latitude !==
                'number' ||
              typeof longitude !==
                'number'
            ) {
              return null;
            }

            return (
              <Marker
                key={`shelter-${index}`}
                coordinate={{
                  latitude,
                  longitude,
                }}
                title={
                  shelter.name
                }
                description={`Prototype shelter location • ${
                  shelter.vicinity ??
                  'Location available'
                }`}
                pinColor="green"
              />
            );
          }
        )}

        {/* ------------------------------------------------ */}
        {/* HOSPITALS                                        */}
        {/* ------------------------------------------------ */}

        {mapFilters.hospitals &&
          hospitals.map(
          (hospital, index) => {
            const latitude =
              hospital?.geometry
                ?.location?.lat;

            const longitude =
              hospital?.geometry
                ?.location?.lng;

            if (
              typeof latitude !==
                'number' ||
              typeof longitude !==
                'number'
            ) {
              return null;
            }

            return (
              <Marker
                key={`hospital-${index}`}
                coordinate={{
                  latitude,
                  longitude,
                }}
                title={
                  hospital.name
                }
                description={
                  hospital.vicinity ??
                  'Nearby hospital'
                }
                pinColor="red"
              />
            );
          }
        )}

        {/* ------------------------------------------------ */}
        {/* NASA EONET REAL NATURAL EVENTS                   */}
        {/* ------------------------------------------------ */}

        {disasterEvents.map(
          (event) => {
            if (
              !event.geometry ||
              event.geometry
                .length === 0
            ) {
              return null;
            }

            const geometry =
              event.geometry[
                event.geometry
                  .length - 1
              ];

            // Currently displaying Point events.
            if (
              geometry.type !==
              'Point'
            ) {
              return null;
            }

            const coordinates =
              geometry.coordinates;

            if (
              !Array.isArray(
                coordinates
              ) ||
              coordinates.length <
                2
            ) {
              return null;
            }

            // EONET / GeoJSON:
            // [longitude, latitude]

            const longitude =
              coordinates[0];

            const latitude =
              coordinates[1];

            if (
              typeof latitude !==
                'number' ||
              typeof longitude !==
                'number'
            ) {
              return null;
            }

            const category =
              event.categories?.[0]
                ?.title ??
              'Natural Event';

            const categoryFilter = getEonetFilterKey(category);
            if (!mapFilters[categoryFilter]) return null;

            const distanceKm =
              getDistanceInMeters(
                location.latitude,
                location.longitude,
                latitude,
                longitude
              ) / 1000;

            return (
              <Marker
                key={`disaster-${event.id}`}
                coordinate={{
                  latitude,
                  longitude,
                }}
                title={`⚠️ ${event.title}`}
                description={`${category} • ${distanceKm.toFixed(
                  0
                )} km away • NASA EONET`}
                pinColor={getEonetMarkerColor(category)}
              />
            );
          }
        )}

        {/* ------------------------------------------------ */}
        {/* USGS REAL EARTHQUAKES                            */}
        {/* ------------------------------------------------ */}

        {mapFilters.earthquakes &&
          earthquakes.map(
          (earthquake) => {
            const coordinates =
              earthquake?.geometry
                ?.coordinates;

            if (
              !Array.isArray(
                coordinates
              ) ||
              coordinates.length <
                3
            ) {
              return null;
            }

            // USGS GeoJSON:
            // [longitude, latitude, depth]

            const longitude =
              coordinates[0];

            const latitude =
              coordinates[1];

            const depth =
              coordinates[2];

            if (
              typeof latitude !==
                'number' ||
              typeof longitude !==
                'number'
            ) {
              return null;
            }

            const magnitude =
              earthquake
                ?.properties?.mag ??
              0;

            const place =
              earthquake
                ?.properties?.place ??
              'Unknown location';

            const time =
              earthquake
                ?.properties?.time;

            const distanceKm =
              getDistanceInMeters(
                location.latitude,
                location.longitude,
                latitude,
                longitude
              ) / 1000;

            const earthquakeTime =
              time
                ? new Date(
                    time
                  ).toLocaleString()
                : 'Unknown time';

            const depthText =
              typeof depth ===
              'number'
                ? depth.toFixed(1)
                : 'Unknown';

            return (
              <Marker
                key={`earthquake-${earthquake.id}`}
                coordinate={{
                  latitude,
                  longitude,
                }}
                title={`🌋 M${magnitude} Earthquake`}
                description={
                  `${place} • ` +
                  `Depth: ${depthText} km • ` +
                  `${distanceKm.toFixed(
                    0
                  )} km away • ` +
                  `${earthquakeTime} • USGS`
                }
                pinColor="purple"
              />
            );
          }
        )}

        {/* App-defined proximity visualization for an active detected hazard. */}
        {activeHazard &&
          ((activeHazard.type === 'Natural Event' && nearbyEonetHazard && mapFilters[getEonetFilterKey(nearbyEonetHazard.category)]) ||
            (activeHazard.type === 'Earthquake' && mapFilters.earthquakes) ||
            (activeHazard.type === 'Severe Weather' && mapFilters.weather)) && (
          <Circle
            center={{
              latitude: activeHazard.latitude,
              longitude: activeHazard.longitude,
            }}
            radius={activeHazard.type === 'Earthquake' ? 10000 : 5000}
            fillColor="rgba(220, 38, 38, 0.13)"
            strokeColor="rgba(220, 38, 38, 0.50)"
            strokeWidth={2}
          />
        )}
        </MapView>

        {/* Compact filter bar: pinned hazards + full filter sheet. */}
        <View style={styles.hazardTypeBar}>
          <Pressable
            onPress={() => toggleMapFilter('wildfires')}
            style={[
              styles.pinnedHazardChip,
              styles.wildfirePinnedChip,
              !mapFilters.wildfires && styles.pinnedHazardChipInactive,
            ]}
          >
            <Text style={styles.pinnedHazardIcon}>🔥</Text>
            <Text style={styles.wildfirePinnedText}>Wildfires</Text>
            <View style={styles.wildfireCountBadge}>
              <Text style={styles.wildfireCountText}>
                {eonetCategoryCounts.wildfires}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => toggleMapFilter('severeStorms')}
            style={[
              styles.pinnedHazardChip,
              styles.stormPinnedChip,
              !mapFilters.severeStorms && styles.pinnedHazardChipInactive,
            ]}
          >
            <Text style={styles.pinnedHazardIcon}>🌪️</Text>
            <Text style={styles.stormPinnedText}>Storms</Text>
            <View style={styles.stormCountBadge}>
              <Text style={styles.stormCountText}>
                {eonetCategoryCounts.severeStorms}
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.moreFilterChip} onPress={openFilterSheet}>
            <Text style={styles.moreFilterText}>•••</Text>
          </Pressable>

          <Pressable style={styles.filtersButton} onPress={openFilterSheet}>
            <Text style={styles.filtersButtonIcon}>☷</Text>
            <Text style={styles.filtersButtonText}>Filters</Text>
          </Pressable>
        </View>

        {/* Bottom sheet changes when a relevant hazard is detected. */}
        <View style={[styles.bottomSheet, activeHazard && styles.bottomSheetAlert]}>
          <View style={styles.sheetHandle} />

          {activeHazard ? (
            <>
              <View style={styles.activeWarningCard}>
                <Text style={styles.activeWarningTitle}>
                  ⚠️ {activeHazard.type} warning active
                </Text>
                <Text style={styles.activeWarningText}>{activeHazard.title}</Text>
                <Text style={styles.activeWarningDetail}>{activeHazard.detail}</Text>
                <Text style={styles.activeWarningSource}>
                  Source: {activeHazard.source} • Alerta Ready proximity rule
                </Text>
              </View>

              <Pressable
                style={[
                  styles.alertDirectionButton,
                  !nearestShelter && styles.directionButtonDisabled,
                ]}
                disabled={!nearestShelter}
                onPress={() => nearestShelter && handleDirections(nearestShelter, 'shelter')}
              >
                <Text style={styles.alertDirectionButtonText}>
                  📍 Get Directions to nearest shelter
                </Text>
              </Pressable>

              <View style={styles.responseCardsRow}>
                <View style={styles.responseCard}>
                  <Text style={styles.responseIcon}>🏠</Text>
                  <Text style={styles.responseValue}>
                    {nearestShelter ? `${nearestShelter.distanceKm.toFixed(1)} km` : '--'}
                  </Text>
                  <Text style={styles.responseLabel}>Nearest prototype shelter</Text>
                  {nearestShelter && (
                    <>
                      <Text style={styles.responseDetail} numberOfLines={1}>
                        {nearestShelter.name}
                      </Text>
                      <Pressable
                        style={styles.smallDirectionButton}
                        onPress={() => handleDirections(nearestShelter, 'shelter')}
                      >
                        <Text style={styles.smallDirectionButtonText}>Directions</Text>
                      </Pressable>
                    </>
                  )}
                </View>

                <View style={styles.responseCard}>
                  <Text style={styles.responseIcon}>🏥</Text>
                  <Text style={styles.responseValue}>
                    {nearestHospital ? `${nearestHospital.distanceKm.toFixed(1)} km` : '--'}
                  </Text>
                  <Text style={styles.responseLabel}>Nearest hospital</Text>
                  {nearestHospital && (
                    <>
                      <Text style={styles.responseDetail} numberOfLines={1}>
                        {nearestHospital.name}
                      </Text>
                      <Pressable
                        style={styles.smallDirectionButton}
                        onPress={() => handleDirections(nearestHospital, 'hospital')}
                      >
                        <Text style={styles.smallDirectionButtonText}>Directions</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              {/* ------------------------------------------------ */}
              {/* SAFE / NORMAL STATUS                             */}
              {/* ------------------------------------------------ */}
              <View
                style={[
                  styles.compactStatusBanner,
                  riskLevel === 'Moderate Risk'
                    ? styles.compactStatusBannerModerate
                    : styles.compactStatusBannerLow,
                ]}
              >
                <Text
                  style={[
                    styles.compactStatusIcon,
                    riskLevel === 'Moderate Risk'
                      ? styles.compactStatusIconModerate
                      : styles.compactStatusIconLow,
                  ]}
                >
                  {riskLevel === 'Moderate Risk' ? '!' : '✓'}
                </Text>

                <Text style={styles.compactStatusText} numberOfLines={1}>
                  {riskLevel === 'Moderate Risk'
                    ? 'Moderate weather risk nearby'
                    : 'No immediate hazard nearby'}
                </Text>

                <View
                  style={[
                    styles.compactRiskPill,
                    riskLevel === 'Moderate Risk'
                      ? styles.compactRiskPillModerate
                      : styles.compactRiskPillLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.compactRiskPillText,
                      riskLevel === 'Moderate Risk'
                        ? styles.compactRiskPillTextModerate
                        : styles.compactRiskPillTextLow,
                    ]}
                  >
                    {riskLevel}
                  </Text>
                </View>
              </View>

              {/* ------------------------------------------------ */}
              {/* NEARBY EMERGENCY LOCATIONS                       */}
              {/* ------------------------------------------------ */}
              <Text style={styles.compactSectionTitle}>
                Nearby emergency locations
              </Text>

              <View style={styles.compactLocationCard}>
                <View style={styles.compactLocationMain}>
                  <View style={styles.compactShelterIconBox}>
                    <Text style={styles.compactLocationEmoji}>🏠</Text>
                  </View>

                  <View style={styles.compactLocationTextWrap}>
                    <Text style={styles.compactLocationName} numberOfLines={1}>
                      {nearestShelter?.name ?? 'No shelter available'}
                    </Text>
                    <Text style={styles.compactLocationMeta} numberOfLines={1}>
                      {nearestShelter
                        ? `Shelter · ${nearestShelter.distanceKm.toFixed(1)} km away`
                        : 'Prototype shelter information unavailable'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={!nearestShelter}
                  onPress={() =>
                    nearestShelter &&
                    handleDirections(nearestShelter, 'shelter')
                  }
                  style={[
                    styles.compactShelterDirectionsButton,
                    !nearestShelter && styles.compactDirectionDisabled,
                  ]}
                >
                  <Text style={styles.compactShelterDirectionsText}>
                    Directions
                  </Text>
                </Pressable>
              </View>

              <View style={styles.compactLocationCard}>
                <View style={styles.compactLocationMain}>
                  <View style={styles.compactHospitalIconBox}>
                    <Text style={styles.compactHospitalIcon}>♙</Text>
                  </View>

                  <View style={styles.compactLocationTextWrap}>
                    <Text style={styles.compactLocationName} numberOfLines={1}>
                      {nearestHospital?.name ?? 'No hospital available'}
                    </Text>
                    <Text style={styles.compactLocationMeta} numberOfLines={1}>
                      {nearestHospital
                        ? `Hospital · ${nearestHospital.distanceKm.toFixed(1)} km away`
                        : 'Hospital information unavailable'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={!nearestHospital}
                  onPress={() =>
                    nearestHospital &&
                    handleDirections(nearestHospital, 'hospital')
                  }
                  style={[
                    styles.compactHospitalDirectionsButton,
                    !nearestHospital && styles.compactDirectionDisabled,
                  ]}
                >
                  <Text style={styles.compactHospitalDirectionsText}>
                    Directions
                  </Text>
                </Pressable>
              </View>

              {/* ------------------------------------------------ */}
              {/* NEAREST MONITORED HAZARDS                        */}
              {/* ------------------------------------------------ */}
              <Text style={styles.compactHazardsTitle}>
                Nearest monitored hazards
              </Text>

              <View style={styles.compactHazardsRow}>
                <View style={styles.compactHazardSummary}>
                  <View style={styles.compactHazardHeader}>
                    <Text style={styles.compactHazardIcon}>〰</Text>
                    <Text style={styles.compactHazardSource}>USGS</Text>
                  </View>

                  {nearestEarthquake ? (
                    <>
                      <Text style={styles.compactHazardName} numberOfLines={1}>
                        M{nearestEarthquake.magnitude} earthquake
                      </Text>
                      <Text style={styles.compactHazardDistance}>
                        {nearestEarthquake.distanceKm.toFixed(0)} km away
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.compactHazardName}>
                        No recent earthquake
                      </Text>
                      <Text style={styles.compactHazardDistance}>
                        No data available
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.compactHazardSummary}>
                  <View style={styles.compactHazardHeader}>
                    <Text style={styles.compactHazardIcon}>
                      {nearestEonetEvent
                        ? getNaturalEventSummaryIcon(nearestEonetEvent.category)
                        : '⚠️'}
                    </Text>
                    <Text style={styles.compactHazardSource}>NASA EONET</Text>
                  </View>

                  {nearestEonetEvent ? (
                    <>
                      <Text style={styles.compactHazardName} numberOfLines={1}>
                        {getNaturalEventSummaryTitle(
                          nearestEonetEvent.category
                        )}
                      </Text>
                      <Text style={styles.compactHazardDistance}>
                        {nearestEonetEvent.distanceKm.toFixed(0)} km away
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.compactHazardName}>
                        No current event
                      </Text>
                      <Text style={styles.compactHazardDistance}>
                        No data available
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Text style={styles.compactDataSourceText}>
                Live data from NASA EONET, USGS and Tomorrow.io
              </Text>
            </>
          )}
        </View>
      </View>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHandle} />

            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filters</Text>

              <Pressable onPress={resetPendingFilters} hitSlop={10}>
                <Text style={styles.filterResetText}>Reset</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.filterSheetScroll}
              contentContainerStyle={styles.filterSheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filterOptions.map((option) => {
                const hasNoData =
                  typeof option.count === 'number' && option.count === 0;

                return (
                  <View
                    key={option.key}
                    style={[
                      styles.filterRow,
                      hasNoData && styles.filterRowNoData,
                    ]}
                  >
                    <View style={styles.filterRowLeft}>
                      <Text style={styles.filterRowIcon}>{option.icon}</Text>

                      <Text style={styles.filterRowLabel}>
                        {option.label}
                      </Text>

                      <View
                        style={[
                          styles.filterCountBadge,
                          option.key === 'wildfires' &&
                            styles.filterCountBadgeWildfire,
                          option.key === 'severeStorms' &&
                            styles.filterCountBadgeStorm,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterCountText,
                            option.key === 'wildfires' &&
                              styles.filterCountTextWildfire,
                            option.key === 'severeStorms' &&
                              styles.filterCountTextStorm,
                          ]}
                        >
                          {option.count}
                        </Text>
                      </View>
                    </View>

                    {!hasNoData && (
                      <Switch
                        value={pendingFilters[option.key]}
                        onValueChange={() =>
                          togglePendingFilter(option.key)
                        }
                        trackColor={{
                          false: '#D1D5DB',
                          true: '#16A34A',
                        }}
                        thumbColor="#FFFFFF"
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.filterApplyButton}
              onPress={applyPendingFilters}
            >
              <Text style={styles.filterApplyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>

  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        '#F8FAFC',
    },

    loadingContainer: {
      flex: 1,
      justifyContent:
        'center',
      alignItems: 'center',
      backgroundColor:
        '#F8FAFC',
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
      backgroundColor:
        '#F8FAFC',
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
      backgroundColor:
        '#FEF2F2',
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
      backgroundColor:
        '#FFFFFF',
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
      justifyContent:
        'space-between',
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
      backgroundColor:
        '#FFFFFF',
      padding: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      elevation: 8,
    },

    alertRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 10,
    },

    alertTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 4,
    },

    alertText: {
      color: '#4B5563',
      fontSize: 13,
      marginBottom: 8,
    },

    riskText: {
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 3,
    },

    statsRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginTop: 12,
      marginBottom: 14,
    },

    stat: {
      fontSize: 11,
      color: '#374151',
      fontWeight: '600',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#E5E7EB',
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
      backgroundColor:
        '#DBEAFE',
      justifyContent:
        'center',
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

    liveBadge: {
      backgroundColor:
        '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },

    liveText: {
      color: '#16A34A',
      fontSize: 10,
      fontWeight: 'bold',
    },

    hazardSection: {
      marginTop: 12,
      marginBottom: 14,
    },

    hazardSectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 10,
    },

    hazardCard: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    hazardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },

    hazardIcon: {
      fontSize: 22,
    },

    hazardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#111827',
    },

    hazardSource: {
      fontSize: 10,
      color: '#6B7280',
      marginTop: 1,
    },

    hazardMain: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 5,
    },

    hazardDetail: {
      fontSize: 11,
      color: '#4B5563',
      marginTop: 2,
    },

    hazardTime: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 5,
    },

    hazardEmpty: {
      fontSize: 11,
      color: '#6B7280',
    },

    weatherSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    weatherSummaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#374151',
    },

    weatherRisk: {
      fontSize: 12,
      fontWeight: 'bold',
    },

    compactHeader: {
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },

    liveHeaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: '#ECFDF5',
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },

    liveHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#047857',
    },

    mapArea: {
      flex: 1,
      position: 'relative',
      backgroundColor: '#E5E7EB',
    },

    hazardTypeBar: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 7,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.97)',
      elevation: 5,
    },

    pinnedHazardChip: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      borderRadius: 18,
    },

    pinnedHazardChipInactive: {
      opacity: 0.42,
    },

    wildfirePinnedChip: {
      backgroundColor: '#FDE2E2',
    },

    stormPinnedChip: {
      backgroundColor: '#FDE7B2',
    },

    pinnedHazardIcon: {
      fontSize: 11,
    },

    wildfirePinnedText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#B42318',
    },

    stormPinnedText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#9A6700',
    },

    wildfireCountBadge: {
      minWidth: 20,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: '#F9BFC1',
      alignItems: 'center',
      justifyContent: 'center',
    },

    stormCountBadge: {
      minWidth: 20,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: '#F5CD78',
      alignItems: 'center',
      justifyContent: 'center',
    },

    wildfireCountText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#B42318',
    },

    stormCountText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#9A6700',
    },

    moreFilterChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },

    moreFilterText: {
      marginTop: -5,
      fontSize: 15,
      fontWeight: '900',
      color: '#4B5563',
    },

    filtersButton: {
      minHeight: 34,
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
    },

    filtersButtonIcon: {
      fontSize: 13,
      fontWeight: '900',
      color: '#111827',
    },

    filtersButtonText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111827',
    },

    filterModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(17,24,39,0.32)',
    },

    filterSheet: {
      maxHeight: '82%',
      minHeight: 470,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: '#FFFFFF',
      elevation: 18,
    },

    filterSheetHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      marginBottom: 14,
      borderRadius: 2,
      backgroundColor: '#D1D5DB',
    },

    filterSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },

    filterSheetTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#111827',
    },

    filterResetText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#111827',
    },

    filterSheetScroll: {
      flexGrow: 0,
    },

    filterSheetScrollContent: {
      paddingBottom: 12,
    },

    filterRow: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },

    filterRowNoData: {
      opacity: 0.45,
    },

    filterRowLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 12,
    },

    filterRowIcon: {
      width: 22,
      fontSize: 15,
      textAlign: 'center',
    },

    filterRowLabel: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
      color: '#111827',
    },

    filterCountBadge: {
      minWidth: 24,
      minHeight: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterCountBadgeWildfire: {
      backgroundColor: '#FDE2E2',
    },

    filterCountBadgeStorm: {
      backgroundColor: '#FDE7B2',
    },

    filterCountText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#6B7280',
    },

    filterCountTextWildfire: {
      color: '#B42318',
    },

    filterCountTextStorm: {
      color: '#9A6700',
    },

    filterApplyButton: {
      minHeight: 48,
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: '#050505',
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterApplyButtonText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    bottomSheet: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 12,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.98)',
      elevation: 12,
    },

    sheetHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#D1D5DB',
      marginBottom: 9,
    },

    weatherStrip: {
      minHeight: 38,
      borderRadius: 10,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    weatherStripLow: {
      backgroundColor: '#DCFCE7',
    },

    weatherStripModerate: {
      backgroundColor: '#FEF3C7',
    },

    weatherStripHigh: {
      backgroundColor: '#FEE2E2',
    },

    weatherStripText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      color: '#1F2937',
    },

    weatherStripLevel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#374151',
    },

    nearbyTitle: {
      marginTop: 10,
      marginBottom: 7,
      fontSize: 12,
      fontWeight: '800',
      color: '#111827',
    },

    nearbyCardsRow: {
      flexDirection: 'row',
      gap: 8,
    },

    nearbyCard: {
      flex: 1,
      minWidth: 0,
      minHeight: 96,
      padding: 10,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    nearbyCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 5,
    },

    nearbyIcon: {
      fontSize: 15,
    },

    nearbySource: {
      fontSize: 8,
      fontWeight: '700',
      color: '#6B7280',
    },

    nearbyValue: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111827',
    },

    nearbyLabel: {
      marginTop: 2,
      fontSize: 9,
      color: '#6B7280',
    },

    nearbyDistance: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: '700',
      color: '#111827',
    },

    nearbyDetail: {
      marginTop: 2,
      fontSize: 9,
      color: '#6B7280',
    },

    nearbyUnavailable: {
      marginTop: 12,
      fontSize: 10,
      color: '#6B7280',
    },

    emergencyLocationsTitle: {
      marginTop: 10,
      marginBottom: 7,
      fontSize: 12,
      fontWeight: '800',
      color: '#111827',
    },

    emergencyLocationsRow: {
      flexDirection: 'row',
      gap: 8,
    },

    emergencyLocationCard: {
      flex: 1,
      minWidth: 0,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 9,
    },

    emergencyLocationTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 4,
    },

    emergencyLocationIcon: {
      fontSize: 14,
    },

    emergencyLocationType: {
      fontSize: 8,
      fontWeight: '800',
      color: '#6B7280',
    },

    emergencyLocationName: {
      fontSize: 10,
      fontWeight: '700',
      color: '#111827',
    },

    emergencyLocationDistance: {
      marginTop: 3,
      fontSize: 10,
      color: '#6B7280',
    },

    emergencyLocationUnavailable: {
      marginTop: 8,
      fontSize: 9,
      color: '#6B7280',
    },

    locationDirectionButton: {
      minHeight: 30,
      marginTop: 7,
      borderRadius: 8,
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },

    locationDirectionButtonText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#047857',
    },

    compactStatusBanner: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 12,
    },

    compactStatusBannerLow: {
      backgroundColor: '#DDF4DF',
    },

    compactStatusBannerModerate: {
      backgroundColor: '#FEF3C7',
    },

    compactStatusIcon: {
      width: 15,
      fontSize: 11,
      fontWeight: '900',
      textAlign: 'center',
    },

    compactStatusIconLow: {
      color: '#15803D',
    },

    compactStatusIconModerate: {
      color: '#B45309',
    },

    compactStatusText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: '#111827',
    },

    compactRiskPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },

    compactRiskPillLow: {
      backgroundColor: '#ECFDF3',
    },

    compactRiskPillModerate: {
      backgroundColor: '#FFF7D6',
    },

    compactRiskPillText: {
      fontSize: 9,
      fontWeight: '900',
    },

    compactRiskPillTextLow: {
      color: '#15803D',
    },

    compactRiskPillTextModerate: {
      color: '#B45309',
    },

    compactSectionTitle: {
      marginBottom: 7,
      fontSize: 12,
      fontWeight: '900',
      color: '#111827',
    },

    compactLocationCard: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 7,
      borderRadius: 10,
      backgroundColor: '#FAFAFA',
    },

    compactLocationMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    compactLocationTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    compactShelterIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#CDECCF',
    },

    compactHospitalIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },

    compactLocationEmoji: {
      fontSize: 16,
    },

    compactHospitalIcon: {
      fontSize: 18,
      fontWeight: '900',
      color: '#2563EB',
    },

    compactLocationName: {
      fontSize: 12,
      fontWeight: '900',
      color: '#111827',
    },

    compactLocationMeta: {
      marginTop: 2,
      fontSize: 10,
      color: '#4B5563',
    },

    compactShelterDirectionsButton: {
      minWidth: 76,
      minHeight: 30,
      paddingHorizontal: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#16A34A',
    },

    compactShelterDirectionsText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    compactHospitalDirectionsButton: {
      minWidth: 70,
      minHeight: 30,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },

    compactHospitalDirectionsText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#111827',
    },

    compactDirectionDisabled: {
      opacity: 0.4,
    },

    compactHazardsTitle: {
      marginTop: 8,
      marginBottom: 5,
      fontSize: 11,
      fontWeight: '800',
      color: '#8B8178',
    },

    compactHazardsRow: {
      flexDirection: 'row',
      gap: 14,
      paddingHorizontal: 8,
      paddingTop: 4,
    },

    compactHazardSummary: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 4,
    },

    compactHazardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },

    compactHazardIcon: {
      fontSize: 12,
      color: '#A3A3A3',
    },

    compactHazardSource: {
      fontSize: 7,
      fontWeight: '700',
      color: '#A3A3A3',
    },

    compactHazardName: {
      fontSize: 11,
      fontWeight: '800',
      color: '#737373',
    },

    compactHazardDistance: {
      marginTop: 2,
      fontSize: 9,
      color: '#A3A3A3',
    },

    compactDataSourceText: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 8,
      color: '#8B8178',
    },

    dataSourceText: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 8,
      color: '#9CA3AF',
    },

    bottomSheetAlert: {
      borderWidth: 1,
      borderColor: '#FCA5A5',
    },

    activeWarningCard: {
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      padding: 12,
      marginBottom: 10,
    },

    activeWarningTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#B91C1C',
      marginBottom: 5,
    },

    activeWarningText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#7F1D1D',
    },

    activeWarningDetail: {
      marginTop: 3,
      fontSize: 11,
      color: '#7F1D1D',
    },

    activeWarningSource: {
      marginTop: 6,
      fontSize: 8,
      color: '#991B1B',
    },

    alertDirectionButton: {
      minHeight: 42,
      borderRadius: 10,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      marginBottom: 9,
    },

    alertDirectionButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    responseCardsRow: {
      flexDirection: 'row',
      gap: 8,
    },

    responseCard: {
      flex: 1,
      minWidth: 0,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      padding: 10,
      minHeight: 88,
    },

    responseIcon: {
      fontSize: 15,
      marginBottom: 3,
    },

    responseValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#111827',
    },

    responseLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: '600',
      color: '#374151',
    },

    responseDetail: {
      marginTop: 3,
      fontSize: 8,
      color: '#6B7280',
    },

    directionButtonDisabled: {
      opacity: 0.45,
    },

    smallDirectionButton: {
      minHeight: 28,
      marginTop: 7,
      borderRadius: 7,
      backgroundColor: '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },

    smallDirectionButtonText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#374151',
    },

    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },

    secondaryButton: {
      flex: 1,
      backgroundColor:
        '#F3F4F6',
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
      backgroundColor:
        '#10B981',
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center',
    },

    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
  });