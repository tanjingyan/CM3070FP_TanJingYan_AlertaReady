import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Modal,
  Switch,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  GOOGLE_PLACES_API_KEY,
} from '../../constants/api';

type SelectedHazardDetail = {
  id: string;
  filterKey: string;
  icon: string;
  category: string;
  title: string;
  source: string;
  latitude: number;
  longitude: number;
  distanceText: string;
  detailLines: string[];
};

type PlaceSearchSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  // Use exactly the same card width, height and gap for:
  // - Nearest shelter
  // - Nearest hospital
  // - Every Selected filters card
  //
  // cleanInfoContent has 12 px horizontal padding on each side, so subtract
  // 24 px from the screen width, then split the remaining space into two
  // equal cards with one 10 px gap.
  const { width: screenWidth } = useWindowDimensions();
  const UNIFIED_CARD_GAP = 10;
  const UNIFIED_CARD_WIDTH = Math.floor(
    (screenWidth - 24 - UNIFIED_CARD_GAP) / 2
  );
  const UNIFIED_CARD_HEIGHT = 156;
  const SELECTED_FILTER_CARD_HEIGHT = 112;

  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  // The map can monitor either the device GPS position or an area selected
  // through the search box. Hazard distances and facility results are based
  // on this active map area. Directions still use fresh device GPS.
  const [activeAreaLabel, setActiveAreaLabel] =
    useState('Current location');

  const [searchQuery, setSearchQuery] =
    useState('');

  const [searchSuggestions, setSearchSuggestions] =
    useState<PlaceSearchSuggestion[]>([]);

  const [searchSuggestionsLoading, setSearchSuggestionsLoading] =
    useState(false);

  const [showSearchSuggestions, setShowSearchSuggestions] =
    useState(false);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [recenterLoading, setRecenterLoading] =
    useState(false);

  const [riskLevel, setRiskLevel] =
    useState('Unavailable');

  // Human-readable explanation for the app-defined weather-risk result.
  // Open-Meteo supplies the variables; Alerta Ready applies the prototype
  // thresholds below. This is not an official weather warning.
  const [weatherRiskDetails, setWeatherRiskDetails] = useState(
    'No elevated weather indicators detected.'
  );

  // Keep the individual Open-Meteo components instead of only the overall
  // Weather Risk. Matching components are inserted into the corresponding
  // hazard collections at the SAME monitored coordinates:
  // rain/flood -> Floods, wind/gust -> Storms, temperature -> Other Natural.
  const [weatherHazardRisks, setWeatherHazardRisks] = useState({
    rainFloodRisk: 'Unavailable',
    windRisk: 'Unavailable',
    temperatureRisk: 'Unavailable',
  });

  // Raw Open-Meteo values used by the local risk cards. Keeping the real
  // measurements lets the UI explain WHY a risk level was assigned instead
  // of showing internal/debug wording such as "matched component".
  const [weatherMetrics, setWeatherMetrics] = useState<{
    rain: number;
    precipitation: number;
    precipitationProbability: number;
    soilMoisture: number;
    windSpeed: number;
    windGusts: number;
    temperature: number;
    apparentTemperature: number;
  } | null>(null);

  const [airQuality, setAirQuality] = useState({
    usAqi: 0,
    pm25: 0,
    pm10: 0,
    aerosolOpticalDepth: 0,
    usAqiLabel: 'Unavailable',
  });


  const [hasAirQualityData, setHasAirQualityData] =
    useState(false);

  const [shelters, setShelters] =
    useState<any[]>([]);

  const [hospitals, setHospitals] =
    useState<any[]>([]);

  // NASA EONET real natural events
  const [disasterEvents, setDisasterEvents] =
    useState<any[]>([]);

  // GDACS global flood events
  // Used alongside NASA EONET to improve worldwide flood-event coverage.
  const [gdacsFloods, setGdacsFloods] =
    useState<any[]>([]);

  // USGS real earthquakes
  const [earthquakes, setEarthquakes] =
    useState<any[]>([]);

  // Hazard selected by tapping a nearest-hazard card or a hazard marker.
  // When populated, the map focuses on that location and shows a dismissible
  // floating information card above the map.
  const [selectedHazard, setSelectedHazard] =
    useState<SelectedHazardDetail | null>(null);

  // When the user opens any hazard marker/card, fetch Open-Meteo for that
  // hazard's coordinates. This keeps the weather context synchronised with
  // the place currently being viewed on the map instead of continuing to
  // display weather for the monitored/home location.
  const [selectedHazardWeather, setSelectedHazardWeather] =
    useState<{
      riskLevel: string;
      details: string;
    } | null>(null);

  const [
    selectedHazardWeatherLoading,
    setSelectedHazardWeatherLoading,
  ] = useState(false);

  // When a filter contains more than one nearby event, keep the matching
  // hazards together so the user can browse Previous / Next or open a list.
  const [selectedHazardCollection, setSelectedHazardCollection] =
    useState<SelectedHazardDetail[]>([]);

  const [selectedHazardIndex, setSelectedHazardIndex] =
    useState(0);

  const [hazardListModalVisible, setHazardListModalVisible] =
    useState(false);

  // When more than one shelter/hospital is available, the Selected filters
  // carousel shows a summary card. Tapping it opens this facility list.
  const [facilityListModalVisible, setFacilityListModalVisible] =
    useState(false);

  const [selectedFacilityType, setSelectedFacilityType] =
    useState<'shelter' | 'hospital' | null>(null);

  // Map marker / information filters.
  // Event feeds, local conditions and nearby facilities are kept separate so
  // a number such as AQI is never presented as though it were an event count.
  const [mapFilters, setMapFilters] = useState({
    shelters: true,
    hospitals: true,
    earthquakes: false,
    wildfires: true,
    severeStorms: true,
    volcanoes: false,
    floods: false,
    landslides: false,
    dustHazeEvents: false,
    drought: false,
    ice: false,
    otherNatural: false,
    weatherRisk: false,
    airQuality: false,
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
    | 'dustHazeEvents'
    | 'drought'
    | 'ice'
    | 'otherNatural'
    | 'weatherRisk'
    | 'airQuality';

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
      earthquakes: false,
      wildfires: true,
      severeStorms: true,
      volcanoes: false,
      floods: false,
      landslides: false,
      dustHazeEvents: false,
      drought: false,
      ice: false,
      otherNatural: false,
      weatherRisk: false,
      airQuality: false,
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
    if (c.includes('dust') || c.includes('haze') || c.includes('smoke')) return 'dustHazeEvents';
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
      case 'dustHazeEvents': return '#A16207';
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
      case 'dustHazeEvents':
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
      case 'dustHazeEvents':
        return '🌫️';
      case 'drought':
        return '🏜️';
      case 'ice':
        return '🧊';
      default:
        return '⚠️';
    }
  }

  function getHazardFilterPalette(filter: MapFilter) {
    switch (filter) {
      case 'wildfires':
        return {
          background: '#FDE2E2',
          border: '#F7CACA',
          text: '#B42318',
          badge: '#F9BFC1',
        };
      case 'severeStorms':
        return {
          background: '#FDE7B2',
          border: '#F2D28B',
          text: '#9A6700',
          badge: '#F5CD78',
        };
      case 'volcanoes':
        return {
          background: '#F3F4F6',
          border: '#D1D5DB',
          text: '#4B5563',
          badge: '#E5E7EB',
        };
      case 'floods':
        return {
          background: '#E0F2FE',
          border: '#BAE6FD',
          text: '#0369A1',
          badge: '#BAE6FD',
        };
      case 'earthquakes':
        return {
          background: '#F3E8FF',
          border: '#E9D5FF',
          text: '#7E22CE',
          badge: '#E9D5FF',
        };
      case 'weatherRisk':
        return {
          background: '#E0F2FE',
          border: '#BAE6FD',
          text: '#0369A1',
          badge: '#BAE6FD',
        };
      case 'landslides':
        return {
          background: '#FEF3C7',
          border: '#FDE68A',
          text: '#92400E',
          badge: '#FDE68A',
        };
      case 'dustHazeEvents':
      case 'airQuality':
        return {
          background: '#F5F5F4',
          border: '#D6D3D1',
          text: '#57534E',
          badge: '#E7E5E4',
        };
      case 'drought':
        return {
          background: '#FEF3C7',
          border: '#FDE68A',
          text: '#A16207',
          badge: '#FDE68A',
        };
      case 'ice':
        return {
          background: '#ECFEFF',
          border: '#A5F3FC',
          text: '#0E7490',
          badge: '#CFFAFE',
        };
      default:
        return {
          background: '#F3F4F6',
          border: '#E5E7EB',
          text: '#4B5563',
          badge: '#E5E7EB',
        };
    }
  }

  function getHazardFilterPluralLabel(filter: MapFilter) {
    switch (filter) {
      case 'wildfires':
        return 'Wildfires';
      case 'severeStorms':
        return 'Storms';
      case 'volcanoes':
        return 'Volcanoes';
      case 'floods':
        return 'Flood Events';
      case 'earthquakes':
        return 'Earthquakes';
      case 'weatherRisk':
        return 'Weather Risk';
      case 'landslides':
        return 'Landslides';
      case 'dustHazeEvents':
        return 'Dust / Haze Events';
      case 'airQuality':
        return 'Air Quality / Haze';
      case 'drought':
        return 'Drought';
      case 'ice':
        return 'Ice';
      case 'otherNatural':
        return 'Other events';
      default:
        return 'Hazards';
    }
  }

  function getHazardFilterEmptyLabel(filter: MapFilter) {
    switch (filter) {
      case 'wildfires':
        return 'wildfires';
      case 'severeStorms':
        return 'storms';
      case 'volcanoes':
        return 'volcanoes';
      case 'floods':
        return 'flood events';
      case 'earthquakes':
        return 'earthquakes';
      case 'weatherRisk':
        return 'weather-risk data';
      case 'landslides':
        return 'landslides';
      case 'dustHazeEvents':
        return 'dust or haze events';
      case 'airQuality':
        return 'air-quality data';
      case 'drought':
        return 'drought events';
      case 'ice':
        return 'ice events';
      default:
        return 'natural events';
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

  // ---------------------------------------------------------
  // GLOBAL EMERGENCY / EVACUATION SHELTER VALIDATION
  // ---------------------------------------------------------
  // Google Places does not expose one universal dedicated shelter
  // place type, so Alerta Ready uses location-biased keyword searches
  // and then validates the returned name/address before displaying it.
  //
  // The goal is to support locations globally while avoiding obvious
  // false positives such as animal shelters, homeless shelters,
  // bus shelters and picnic shelters.

  function normaliseShelterText(value: unknown) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const GLOBAL_SHELTER_POSITIVE_KEYWORDS = [
    // English / internationally used terms
    'emergency shelter',
    'evacuation shelter',
    'evacuation center',
    'evacuation centre',
    'emergency evacuation center',
    'emergency evacuation centre',
    'disaster shelter',
    'disaster evacuation center',
    'disaster evacuation centre',
    'civil defense shelter',
    'civil defence shelter',
    'civil defense public shelter',
    'civil defence public shelter',
    'public emergency shelter',
    'relief shelter',
    'relief center',
    'relief centre',
    'refuge center',
    'refuge centre',
    'temporary evacuation center',
    'temporary evacuation centre',
    'temporary emergency shelter',
    'emergency assembly point',
    'evacuation assembly point',
    'cyclone shelter',
    'hurricane shelter',
    'storm shelter',
    'tornado shelter',
    'tsunami shelter',
    'tsunami evacuation',
    'earthquake shelter',
    'earthquake evacuation',

    // Indonesian
    'tempat evakuasi',
    'pusat evakuasi',
    'posko pengungsian',
    'tempat pengungsian',
    'posko bencana',
    'titik kumpul evakuasi',
    'shelter bencana',

    // Malay
    'pusat pemindahan sementara',
    'pusat pemindahan',
    'pusat perlindungan kecemasan',

    // Spanish
    'centro de evacuacion',
    'refugio de emergencia',
    'albergue de emergencia',
    'punto de evacuacion',

    // French
    'centre d evacuation',
    'abri d urgence',
    'refuge d urgence',

    // Portuguese
    'centro de evacuacao',
    'abrigo de emergencia',
    'ponto de evacuacao',

    // German
    'evakuierungszentrum',
    'notunterkunft',
    'schutzraum',

    // Italian
    'centro di evacuazione',
    'rifugio di emergenza',

    // Japanese
    '避難所',
    '指定避難所',
    '緊急避難場所',
    '津波避難所',

    // Korean
    '대피소',
    '재난 대피소',
    '지진 대피소',

    // Chinese (Simplified / Traditional)
    '避难所',
    '应急避难场所',
    '緊急避難場所',
    '避難場所',

    // Arabic
    'مركز إيواء',
    'مأوى طوارئ',
    'مركز إخلاء',

    // Hindi
    'आपातकालीन आश्रय',
    'निकासी केंद्र',
    'शरण स्थल',

    // Thai
    'ศูนย์อพยพ',
    'ที่พักพิงฉุกเฉิน',

    // Vietnamese
    'trung tâm sơ tán',
    'nơi trú ẩn khẩn cấp',
  ];

  const GLOBAL_SHELTER_NEGATIVE_KEYWORDS = [
    'animal shelter',
    'dog shelter',
    'cat shelter',
    'pet shelter',
    'wildlife shelter',
    'homeless shelter',
    'homelessness shelter',
    'women shelter',
    "women's shelter",
    'domestic violence shelter',
    'youth shelter',
    'night shelter',
    'bus shelter',
    'bicycle shelter',
    'bike shelter',
    'picnic shelter',
    'smoking shelter',
    'parking shelter',
    'tax shelter',
  ];

  function isLikelyEmergencyShelter(place: any) {
    const name = normaliseShelterText(place?.name);
    const vicinity = normaliseShelterText(
      place?.vicinity ?? place?.formatted_address ?? ''
    );
    const combined = `${name} ${vicinity}`;

    const businessStatus = String(
      place?.business_status ?? ''
    ).toUpperCase();

    if (
      businessStatus &&
      businessStatus !== 'OPERATIONAL'
    ) {
      return false;
    }

    const containsExcludedMeaning =
      GLOBAL_SHELTER_NEGATIVE_KEYWORDS.some(
        (keyword) =>
          combined.includes(
            normaliseShelterText(keyword)
          )
      );

    if (containsExcludedMeaning) {
      return false;
    }

    return GLOBAL_SHELTER_POSITIVE_KEYWORDS.some(
      (keyword) =>
        combined.includes(
          normaliseShelterText(keyword)
        )
    );
  }

  function getGlobalShelterSearchTerms(
    countryCode?: string | null
  ) {
    const universalTerms = [
      'emergency shelter',
      'evacuation center',
      'disaster shelter',
      'public emergency shelter',
      'civil defense shelter',
      'temporary evacuation center',
    ];

    const cc = String(
      countryCode ?? ''
    ).toUpperCase();

    let regionalTerms: string[] = [];

    if (cc === 'SG') {
      regionalTerms = [
        'Civil Defence Public Shelter',
        'Civil Defence Shelter',
      ];
    } else if (cc === 'ID') {
      regionalTerms = [
        'tempat evakuasi',
        'pusat evakuasi',
        'posko pengungsian',
      ];
    } else if (cc === 'MY') {
      regionalTerms = [
        'pusat pemindahan sementara',
        'pusat pemindahan',
      ];
    } else if (cc === 'JP') {
      regionalTerms = [
        '避難所',
        '指定避難所',
        '津波避難所',
      ];
    } else if (cc === 'KR') {
      regionalTerms = [
        '대피소',
        '재난 대피소',
      ];
    } else if (['CN', 'HK', 'MO', 'TW'].includes(cc)) {
      regionalTerms = [
        '应急避难场所',
        '避难所',
        '緊急避難場所',
      ];
    } else if (
      [
        'ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC',
        'BO', 'PY', 'UY', 'CR', 'PA', 'GT', 'HN', 'SV',
        'NI', 'DO', 'PR',
      ].includes(cc)
    ) {
      regionalTerms = [
        'centro de evacuación',
        'refugio de emergencia',
        'albergue de emergencia',
      ];
    } else if (
      ['FR', 'BE', 'LU', 'MC'].includes(cc)
    ) {
      regionalTerms = [
        "centre d'évacuation",
        "abri d'urgence",
      ];
    } else if (
      ['PT', 'BR', 'AO', 'MZ'].includes(cc)
    ) {
      regionalTerms = [
        'centro de evacuação',
        'abrigo de emergência',
      ];
    } else if (
      ['DE', 'AT', 'CH'].includes(cc)
    ) {
      regionalTerms = [
        'Evakuierungszentrum',
        'Notunterkunft',
      ];
    } else if (cc === 'IT') {
      regionalTerms = [
        'centro di evacuazione',
        'rifugio di emergenza',
      ];
    } else if (cc === 'TH') {
      regionalTerms = [
        'ศูนย์อพยพ',
        'ที่พักพิงฉุกเฉิน',
      ];
    } else if (cc === 'VN') {
      regionalTerms = [
        'trung tâm sơ tán',
        'nơi trú ẩn khẩn cấp',
      ];
    } else if (cc === 'IN') {
      regionalTerms = [
        'आपातकालीन आश्रय',
        'निकासी केंद्र',
      ];
    } else if (
      [
        'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'JO', 'LB',
        'EG', 'IQ', 'MA', 'DZ', 'TN',
      ].includes(cc)
    ) {
      regionalTerms = [
        'مركز إيواء',
        'مركز إخلاء',
      ];
    } else if (cc === 'PH') {
      regionalTerms = [
        'evacuation center',
        'barangay evacuation center',
      ];
    }

    return Array.from(
      new Set([
        ...regionalTerms,
        ...universalTerms,
      ])
    ).slice(0, 8);
  }

  function dedupePlaces(
    places: any[]
  ) {
    const seen =
      new Set<string>();

    return places.filter(
      (place: any) => {
        const id = String(
          place?.place_id ??
            `${place?.name ?? ''}-${place?.geometry?.location?.lat ?? ''}-${place?.geometry?.location?.lng ?? ''}`
        );

        if (seen.has(id)) {
          return false;
        }

        seen.add(id);
        return true;
      }
    );
  }

  function formatDistance(
    distanceKm: number
  ) {
    if (!Number.isFinite(distanceKm)) {
      return '--';
    }

    if (distanceKm < 1) {
      return `${Math.max(
        1,
        Math.round(distanceKm * 1000)
      )} m`;
    }

    return `${distanceKm.toFixed(1)} km`;
  }


  // ---------------------------------------------------------
  // WEATHER CONTEXT FOR A VIEWED HAZARD
  // ---------------------------------------------------------
  // Uses the same prototype thresholds as the monitored-area weather logic.
  // This does NOT make a flood/storm/etc. event depend on Open-Meteo; it only
  // makes the weather information shown on screen follow the coordinates the
  // user is currently viewing.
  async function getWeatherContextForCoordinates(
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
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${weatherVariables}&forecast_hours=1&wind_speed_unit=kmh&timezone=auto`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          riskLevel: 'Unavailable',
          details:
            'Current weather context is temporarily unavailable for this hazard location.',
        };
      }

      const weatherData = await response.json();

      const rain = Number(
        weatherData?.hourly?.rain?.[0] ?? 0
      );

      const precipitation = Number(
        weatherData?.hourly?.precipitation?.[0] ?? 0
      );

      const precipitationProbability = Number(
        weatherData?.hourly?.precipitation_probability?.[0] ?? 0
      );

      const soilMoisture = Number(
        weatherData?.hourly?.soil_moisture_0_to_1cm?.[0] ?? 0
      );

      const windSpeed = Number(
        weatherData?.hourly?.wind_speed_10m?.[0] ?? 0
      );

      const windGusts = Number(
        weatherData?.hourly?.wind_gusts_10m?.[0] ?? 0
      );

      const temperature = Number(
        weatherData?.hourly?.temperature_2m?.[0] ?? 0
      );

      const apparentTemperature = Number(
        weatherData?.hourly?.apparent_temperature?.[0] ?? 0
      );

      const rainFloodRisk =
        rain >= 10 ||
        precipitation >= 10 ||
        precipitationProbability >= 80 ||
        (soilMoisture >= 0.45 &&
          precipitationProbability >= 60)
          ? 'High Risk'
          : rain >= 3 ||
              precipitation >= 3 ||
              precipitationProbability >= 50 ||
              (soilMoisture >= 0.35 &&
                precipitationProbability >= 40)
            ? 'Moderate Risk'
            : 'Low Risk';

      const windRisk =
        windSpeed >= 60 || windGusts >= 75
          ? 'High Risk'
          : windSpeed >= 40 || windGusts >= 50
            ? 'Moderate Risk'
            : 'Low Risk';

      const hottest = Math.max(
        temperature,
        apparentTemperature
      );

      const coldest = Math.min(
        temperature,
        apparentTemperature
      );

      const temperatureRisk =
        hottest >= 40 || coldest <= 0
          ? 'High Risk'
          : hottest >= 35 || coldest <= 5
            ? 'Moderate Risk'
            : 'Low Risk';

      const risks = [
        rainFloodRisk,
        windRisk,
        temperatureRisk,
      ];

      const overallRisk = risks.includes('High Risk')
        ? 'High Risk'
        : risks.includes('Moderate Risk')
          ? 'Moderate Risk'
          : 'Low Risk';

      const indicators: string[] = [];

      if (rainFloodRisk !== 'Low Risk') {
        indicators.push(
          `${rainFloodRisk.toLowerCase()} rain / flood-related conditions`
        );
      }

      if (windRisk !== 'Low Risk') {
        indicators.push(
          `${windRisk.toLowerCase()} wind / gust conditions`
        );
      }

      if (temperatureRisk !== 'Low Risk') {
        indicators.push(
          `${temperatureRisk.toLowerCase()} temperature conditions`
        );
      }

      return {
        riskLevel: overallRisk,
        details:
          indicators.length > 0
            ? `Alerta Ready detected ${indicators.join(', ')} near this hazard location.`
            : 'No elevated Open-Meteo weather indicators were detected near this hazard location.',
      };
    } catch (error) {
      console.warn(
        'Selected-hazard weather context unavailable:',
        error
      );

      return {
        riskLevel: 'Unavailable',
        details:
          'Current weather context is temporarily unavailable for this hazard location.',
      };
    }
  }

  // ---------------------------------------------------------
  // GDACS GLOBAL FLOOD HELPERS
  // ---------------------------------------------------------
  // GDACS SEARCH returns GeoJSON features. For flood-event browsing,
  // Alerta Ready uses the feature Point as a contextual event location.
  // This is not an official flood boundary or evacuation zone.
  function getGdacsFloodPoint(feature: any) {
    const geometry = feature?.geometry;

    if (
      geometry?.type === 'Point' &&
      Array.isArray(geometry?.coordinates) &&
      geometry.coordinates.length >= 2
    ) {
      const longitude = Number(
        geometry.coordinates[0]
      );
      const latitude = Number(
        geometry.coordinates[1]
      );

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        return {
          latitude,
          longitude,
        };
      }
    }

    // Defensive fallback in case a future GDACS payload also exposes
    // coordinates as properties.
    const properties =
      feature?.properties ?? {};

    const latitude = Number(
      properties.latitude ??
      properties.lat
    );

    const longitude = Number(
      properties.longitude ??
      properties.lon ??
      properties.lng
    );

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      return {
        latitude,
        longitude,
      };
    }

    return null;
  }


  function getGdacsFloodEventId(
    feature: any
  ) {
    const properties =
      feature?.properties ?? {};

    return String(
      properties.eventid ??
      properties.eventId ??
      feature?.id ??
      `${properties.name ?? 'flood'}-${properties.fromdate ?? properties.fromDate ?? ''}`
    );
  }


  function formatGdacsDate(
    value: unknown
  ) {
    if (!value) {
      return null;
    }

    const date = new Date(
      String(value)
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleString();
  }


  // Standard U.S. EPA AQI category labels for the Open-Meteo us_aqi value.
  function getUsAqiLabel(usAqi: number) {
    if (!Number.isFinite(usAqi) || usAqi < 0) return 'Unavailable';
    if (usAqi <= 50) return 'Good';
    if (usAqi <= 100) return 'Moderate';
    if (usAqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (usAqi <= 200) return 'Unhealthy';
    if (usAqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  // Emergency-location results are only treated as nearby if their
  // coordinates are within this app-defined display distance.
  const EMERGENCY_LOCATION_MAX_KM = 50;

  // The Android emulator / map search can sometimes use a country's
  // geographic centre when only a country name is selected.
  // -0.789275, 113.921327 is commonly used as Indonesia's centroid,
  // not a real city/neighbourhood location.
  function isGenericIndonesiaCentroid(
    latitude: number,
    longitude: number
  ) {
    const centroidLat = -0.789275;
    const centroidLng = 113.921327;

    const distanceKm =
      getDistanceInMeters(
        latitude,
        longitude,
        centroidLat,
        centroidLng
      ) / 1000;

    return distanceKm < 5;
  }

  // ---------------------------------------------------------
  // UNIFIED LOCAL HAZARD SCOPE
  // ---------------------------------------------------------
  // Every hazard filter, card, marker and contextual circle uses the SAME
  // active map coordinates and the SAME 50 km local monitoring radius.
  // This prevents a card from describing a distant event while the weather
  // panel is describing the selected city/current location.
  //
  // The application remains global: users can search any location worldwide,
  // and the same 50 km local scope is then applied around that location.
  // This is an Alerta Ready prototype display radius, not an official warning
  // or evacuation boundary.
  const NEARBY_FILTER_RADIUS_KM = 50;

  // Visual context radius drawn around hazard markers on the map.
  // This is deliberately a fixed prototype visualisation radius and MUST NOT
  // be interpreted as an official warning, impact, flood or evacuation zone.
  const HAZARD_CONTEXT_ZONE_RADIUS_M = 25000;

  const nearbyEonetCategoryCounts =
    disasterEvents.reduce(
      (counts, event) => {
        if (
          !location ||
          !event?.geometry?.length
        ) {
          return counts;
        }

        const geometry =
          event.geometry[
            event.geometry.length - 1
          ];

        if (
          geometry?.type !== 'Point' ||
          !Array.isArray(
            geometry?.coordinates
          ) ||
          geometry.coordinates.length < 2
        ) {
          return counts;
        }

        const longitude =
          Number(
            geometry.coordinates[0]
          );

        const latitude =
          Number(
            geometry.coordinates[1]
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return counts;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          ) / 1000;

        if (
          distanceKm >
          NEARBY_FILTER_RADIUS_KM
        ) {
          return counts;
        }

        const category =
          event.categories?.[0]
            ?.title ??
          'Natural Event';

        const key =
          getEonetFilterKey(
            category
          );

        if (key in counts) {
          (counts as any)[key] += 1;
        }

        return counts;
      },
      {
        wildfires: 0,
        severeStorms: 0,
        volcanoes: 0,
        floods: 0,
        landslides: 0,
        dustHazeEvents: 0,
        drought: 0,
        ice: 0,
        otherNatural: 0,
      }
    );

  const nearbyGdacsFloodCount =
    gdacsFloods.reduce(
      (count, feature) => {
        if (!location) {
          return count;
        }

        const point =
          getGdacsFloodPoint(
            feature
          );

        if (!point) {
          return count;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            point.latitude,
            point.longitude
          ) / 1000;

        return distanceKm <=
          NEARBY_FILTER_RADIUS_KM
          ? count + 1
          : count;
      },
      0
    );


  const nearbyEarthquakeCount =
    earthquakes.reduce(
      (count, earthquake) => {
        if (!location) {
          return count;
        }

        const coordinates =
          earthquake?.geometry
            ?.coordinates;

        if (
          !Array.isArray(
            coordinates
          ) ||
          coordinates.length < 2
        ) {
          return count;
        }

        const longitude =
          Number(coordinates[0]);

        const latitude =
          Number(coordinates[1]);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return count;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          ) / 1000;

        return distanceKm <=
          NEARBY_FILTER_RADIUS_KM
          ? count + 1
          : count;
      },
      0
    );

  // Filter counts/options are created later from getHazardsForFilter(), so
  // badges, cards, map markers and red circles all use the exact same data.

  // ---------------------------------------------------------
  // GOOGLE PLACES SEARCH AUTOCOMPLETE
  // ---------------------------------------------------------
  // Show place suggestions while the user types. A short debounce avoids
  // sending a Google Places request on every single keystroke.
  useEffect(() => {
    if (!showSearchSuggestions) {
      return;
    }

    const queryText = searchQuery.trim();

    if (queryText.length < 2) {
      setSearchSuggestions([]);
      setSearchSuggestionsLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchSuggestionsLoading(true);

        const locationBias = location
          ? `&location=${location.latitude},${location.longitude}&radius=50000`
          : '';

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            queryText
          )}${locationBias}&key=${GOOGLE_PLACES_API_KEY}`
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (data?.status === 'ZERO_RESULTS') {
          setSearchSuggestions([]);
          return;
        }

        if (
          data?.status !== 'OK' ||
          !Array.isArray(data?.predictions)
        ) {
          console.warn(
            'Google Places autocomplete status:',
            data?.status,
            data?.error_message ?? ''
          );
          setSearchSuggestions([]);
          return;
        }

        const suggestions: PlaceSearchSuggestion[] =
          data.predictions
            .slice(0, 6)
            .map((prediction: any) => ({
              placeId: String(
                prediction?.place_id ?? ''
              ),
              description: String(
                prediction?.description ?? ''
              ),
              mainText: String(
                prediction?.structured_formatting?.main_text ??
                  prediction?.description ??
                  ''
              ),
              secondaryText: String(
                prediction?.structured_formatting?.secondary_text ?? ''
              ),
            }))
            .filter(
              (suggestion: PlaceSearchSuggestion) =>
                suggestion.placeId &&
                suggestion.description
            );

        setSearchSuggestions(suggestions);
      } catch (error) {
        if (!cancelled) {
          console.warn(
            'Google Places autocomplete error:',
            error
          );
          setSearchSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchSuggestionsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    searchQuery,
    showSearchSuggestions,
    location?.latitude,
    location?.longitude,
  ]);

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setShowSearchSuggestions(true);

    if (value.trim().length < 2) {
      setSearchSuggestions([]);
    }
  }

  function clearAreaSearch() {
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
  }

  async function selectSearchSuggestion(
    suggestion: PlaceSearchSuggestion
  ) {
    try {
      setSearchLoading(true);
      setShowSearchSuggestions(false);
      setSearchSuggestions([]);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
          suggestion.placeId
        )}&fields=place_id,name,formatted_address,geometry&key=${GOOGLE_PLACES_API_KEY}`
      );

      const data = await response.json();

      if (
        data?.status !== 'OK' ||
        !data?.result
      ) {
        console.warn(
          'Google Place Details search status:',
          data?.status,
          data?.error_message ?? ''
        );

        Alert.alert(
          'Place unavailable',
          data?.error_message ||
            'Google Places could not load this search result.'
        );
        return;
      }

      const latitude = Number(
        data.result?.geometry?.location?.lat
      );

      const longitude = Number(
        data.result?.geometry?.location?.lng
      );

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        Alert.alert(
          'Place unavailable',
          'This search result did not include valid map coordinates.'
        );
        return;
      }

      const label = String(
        data.result?.name ||
          suggestion.mainText ||
          suggestion.description
      );

      setSearchQuery(
        suggestion.description || label
      );

      await getUserLocation({
        latitude,
        longitude,
        label,
      });
    } catch (error) {
      console.warn(
        'Search suggestion selection error:',
        error
      );

      Alert.alert(
        'Search failed',
        'Alerta Ready could not open this search result. Check your internet connection and try again.'
      );
    } finally {
      setSearchLoading(false);
    }
  }

  // Safety alerts and a hazard the user is actively inspecting should not
  // disappear just because its optional map layer is switched off.
  // Filters control map layers / browse cards only.
  // Tabs remain mounted, so refresh location every time the Map tab
  // becomes active. This picks up a newly selected emulator location.
  useFocusEffect(
    useCallback(() => {
      // Refresh both the 24-hour USGS feed and the location-dependent data
      // whenever the user returns to the Map tab.
      getEarthquakes();
      getUserLocation();
    }, [])
  );

  // initialRegion is only applied once. Explicitly re-centre whenever
  // the stored GPS/emulator coordinates change.
  useEffect(() => {
    if (
      !location ||
      !mapRef.current
    ) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude:
          location.latitude,
        longitude:
          location.longitude,
        latitudeDelta:
          0.08,
        longitudeDelta:
          0.08,
      },
      450
    );
  }, [
    location?.latitude,
    location?.longitude,
  ]);

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

  function getNearestEonetEventForFilter(filter: MapFilter) {
    if (!location || disasterEvents.length === 0) {
      return null;
    }

    const matchingEvents = disasterEvents
      .map((event) => {
        if (!event.geometry || event.geometry.length === 0) {
          return null;
        }

        const geometry =
          event.geometry[event.geometry.length - 1];

        if (geometry.type !== 'Point') {
          return null;
        }

        const coordinates = geometry.coordinates;

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

        const category =
          event.categories?.[0]?.title ??
          'Natural Event';

        if (getEonetFilterKey(category) !== filter) {
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
          description: event.description ?? '',
          category,
          latitude,
          longitude,
          distanceKm,
          eventDate: geometry?.date ?? null,
          sourceNames: Array.isArray(event?.sources)
            ? event.sources
                .map((source: any) => source?.id || source?.title)
                .filter(Boolean)
            : [],
        };
      })
      .filter((event) => event !== null);

    if (matchingEvents.length === 0) {
      return null;
    }

    matchingEvents.sort(
      (a, b) => a!.distanceKm - b!.distanceKm
    );

    return matchingEvents[0];
  }

  function buildEonetHazardDetail(
    event: any,
    latitude: number,
    longitude: number,
    distanceKm: number
  ): SelectedHazardDetail {
    const category =
      event?.categories?.[0]?.title ??
      'Natural Event';

    const geometry =
      event?.geometry?.length
        ? event.geometry[event.geometry.length - 1]
        : null;

    const observedAt =
      geometry?.date &&
      !Number.isNaN(new Date(geometry.date).getTime())
        ? new Date(geometry.date).toLocaleString()
        : null;

    const sourceNames =
      Array.isArray(event?.sources)
        ? event.sources
            .map((source: any) =>
              String(
                source?.title ??
                  source?.id ??
                  ''
              ).trim()
            )
            .filter(Boolean)
        : [];

    const detailLines = [
      `${distanceKm.toFixed(0)} km from ${activeAreaLabel === 'Current location' ? 'your current location' : activeAreaLabel}`,
      observedAt
        ? `Event geometry time: ${observedAt}`
        : 'Event time not supplied by source',
      event?.description
        ? String(event.description)
        : sourceNames.length > 0
          ? `Referenced source: ${sourceNames.join(', ')}`
          : 'Open natural event listed by NASA EONET',
    ];

    return {
      id: `eonet-${event?.id ?? `${latitude}-${longitude}`}`,
      filterKey: getEonetFilterKey(category),
      icon: getNaturalEventSummaryIcon(category),
      category,
      title:
        event?.title ??
        getNaturalEventSummaryTitle(category),
      source: 'NASA EONET',
      latitude,
      longitude,
      distanceText: `${distanceKm.toFixed(0)} km away`,
      detailLines,
    };
  }

  function buildGdacsFloodHazardDetail(
    feature: any,
    latitude: number,
    longitude: number,
    distanceKm: number
  ): SelectedHazardDetail {
    const properties =
      feature?.properties ?? {};

    const eventId =
      getGdacsFloodEventId(
        feature
      );

    const country =
      String(
        properties.country ??
        properties.countryname ??
        properties.countryName ??
        ''
      ).trim();

    const eventName =
      String(
        properties.name ??
        properties.eventname ??
        properties.eventName ??
        (country
          ? `Flood in ${country}`
          : 'Flood event')
      ).trim();

    const alertLevel =
      String(
        properties.alertlevel ??
        properties.alertLevel ??
        ''
      ).trim();

    const fromDate =
      formatGdacsDate(
        properties.fromdate ??
        properties.fromDate
      );

    const toDate =
      formatGdacsDate(
        properties.todate ??
        properties.toDate
      );

    const detailLines = [
      `${distanceKm.toFixed(0)} km from ${
        activeAreaLabel === 'Current location'
          ? 'your current location'
          : activeAreaLabel
      }`,
      country
        ? `Country / area: ${country}`
        : 'Country / area not supplied',
      alertLevel
        ? `GDACS alert level: ${alertLevel}`
        : 'GDACS alert level not supplied',
      fromDate
        ? `Event start: ${fromDate}`
        : 'Event start time not supplied',
      toDate
        ? `Event end / latest period: ${toDate}`
        : 'Event end / latest period not supplied',
      'GDACS provides global disaster-event information. This point is contextual and is not an official local flood boundary.',
    ];

    return {
      id: `gdacs-flood-${eventId}`,
      filterKey: 'floods',
      icon: '🌊',
      category: 'Flood',
      title:
        eventName ||
        'Flood event',
      source: 'GDACS',
      latitude,
      longitude,
      distanceText:
        `${distanceKm.toFixed(0)} km away`,
      detailLines,
    };
  }


  function buildEarthquakeHazardDetail(
    earthquake: any,
    latitude: number,
    longitude: number,
    distanceKm: number
  ): SelectedHazardDetail {
    const magnitude =
      Number(earthquake?.properties?.mag ?? 0);

    const place =
      earthquake?.properties?.place ??
      'Unknown location';

    const time =
      earthquake?.properties?.time;

    const depth =
      Array.isArray(
        earthquake?.geometry?.coordinates
      )
        ? earthquake.geometry.coordinates[2]
        : null;

    const earthquakeTime =
      typeof time === 'number'
        ? new Date(time).toLocaleString()
        : 'Unknown time';

    const depthText =
      typeof depth === 'number'
        ? `${depth.toFixed(1)} km`
        : 'Unknown';

    return {
      id: `usgs-${earthquake?.id ?? `${latitude}-${longitude}`}`,
      filterKey: 'earthquakes',
      icon: '〰️',
      category: 'Earthquake',
      title: `M${magnitude} earthquake`,
      source: 'USGS',
      latitude,
      longitude,
      distanceText: `${distanceKm.toFixed(0)} km away`,
      detailLines: [
        place,
        `Depth: ${depthText}`,
        `Time: ${earthquakeTime}`,
      ],
    };
  }

  function isElevatedRisk(
    value: string
  ) {
    return (
      value === 'Moderate Risk' ||
      value === 'High Risk'
    );
  }

  function buildLocalWeatherMatchedHazard(
    filter: MapFilter
  ): SelectedHazardDetail | null {
    if (!location) {
      return null;
    }

    if (
      filter === 'floods' &&
      isElevatedRisk(
        weatherHazardRisks.rainFloodRisk
      )
    ) {
      return {
        id: 'open-meteo-local-flood-risk',
        filterKey: 'floods',
        icon: '🌊',
        category: 'Flood / Rain Risk',
        title: `${weatherHazardRisks.rainFloodRisk} flood / heavy-rain risk`,
        source: 'Open-Meteo',
        latitude: location.latitude,
        longitude: location.longitude,
        distanceText: 'At your location',
        detailLines: weatherMetrics
          ? [
              `Rain ${weatherMetrics.rain.toFixed(1)} mm • Precipitation ${weatherMetrics.precipitation.toFixed(1)} mm • Chance ${Math.round(weatherMetrics.precipitationProbability)}%`,
              `Soil moisture ${weatherMetrics.soilMoisture.toFixed(2)} m³/m³ • Alerta Ready classification: ${weatherHazardRisks.rainFloodRisk}`,
              'Risk classification is calculated from current Open-Meteo hourly weather data.',
            ]
          : [
              weatherRiskDetails,
              `Alerta Ready classification: ${weatherHazardRisks.rainFloodRisk}`,
              'Current Open-Meteo measurements are temporarily unavailable.',
            ],
      };
    }

    if (
      filter === 'severeStorms' &&
      isElevatedRisk(
        weatherHazardRisks.windRisk
      )
    ) {
      return {
        id: 'open-meteo-local-storm-risk',
        filterKey: 'severeStorms',
        icon: '🌪️',
        category: 'Storm / Wind Risk',
        title: `${weatherHazardRisks.windRisk} wind / storm risk`,
        source: 'Open-Meteo',
        latitude: location.latitude,
        longitude: location.longitude,
        distanceText: 'At your location',
        detailLines: weatherMetrics
          ? [
              `Wind ${weatherMetrics.windSpeed.toFixed(1)} km/h • Gusts ${weatherMetrics.windGusts.toFixed(1)} km/h`,
              `Alerta Ready classification: ${weatherHazardRisks.windRisk}`,
              'Risk classification is calculated from current Open-Meteo hourly weather data.',
            ]
          : [
              weatherRiskDetails,
              `Alerta Ready classification: ${weatherHazardRisks.windRisk}`,
              'Current Open-Meteo measurements are temporarily unavailable.',
            ],
      };
    }

    if (
      filter === 'otherNatural' &&
      isElevatedRisk(
        weatherHazardRisks.temperatureRisk
      )
    ) {
      return {
        id: 'open-meteo-local-temperature-risk',
        filterKey: 'otherNatural',
        icon: '🌡️',
        category: 'Temperature Risk',
        title: `${weatherHazardRisks.temperatureRisk} temperature risk`,
        source: 'Open-Meteo',
        latitude: location.latitude,
        longitude: location.longitude,
        distanceText: 'At your location',
        detailLines: weatherMetrics
          ? [
              `Temperature ${weatherMetrics.temperature.toFixed(1)}°C • Feels like ${weatherMetrics.apparentTemperature.toFixed(1)}°C`,
              `Alerta Ready classification: ${weatherHazardRisks.temperatureRisk}`,
              'Risk classification is calculated from current Open-Meteo hourly weather data.',
            ]
          : [
              weatherRiskDetails,
              `Alerta Ready classification: ${weatherHazardRisks.temperatureRisk}`,
              'Current Open-Meteo measurements are temporarily unavailable.',
            ],
      };
    }

    // Keep local air-quality/haze information consistent with the
    // Dust / Haze Events collection. AQI 101+ is treated as an elevated
    // local context item, while EONET dust/haze events remain available
    // as separate externally reported records in the same collection.
    if (
      filter === 'dustHazeEvents' &&
      hasAirQualityData &&
      airQuality.usAqi >= 101
    ) {
      return {
        id: 'open-meteo-local-haze-risk',
        filterKey: 'dustHazeEvents',
        icon: '🌫️',
        category: 'Local Air Quality / Haze',
        title: `AQI ${Math.round(
          airQuality.usAqi
        )} • ${airQuality.usAqiLabel}`,
        source: 'Open-Meteo / CAMS',
        latitude: location.latitude,
        longitude: location.longitude,
        distanceText: 'At your location',
        detailLines: [
          `AQI ${Math.round(airQuality.usAqi)} • ${airQuality.usAqiLabel} • PM2.5 ${airQuality.pm25.toFixed(1)} µg/m³`,
          `PM10 ${airQuality.pm10.toFixed(1)} µg/m³ • Aerosol optical depth ${airQuality.aerosolOpticalDepth.toFixed(2)}`,
          'Air-quality values are provided by Open-Meteo / CAMS.',
        ],
      };
    }

    return null;
  }

  function getHazardsForFilter(
    filter: MapFilter
  ): SelectedHazardDetail[] {
    if (!location) {
      return [];
    }

    if (filter === 'earthquakes') {
      return earthquakes
        .map((earthquake) => {
          const coordinates =
            earthquake?.geometry?.coordinates;

          if (
            !Array.isArray(coordinates) ||
            coordinates.length < 3
          ) {
            return null;
          }

          const longitude = Number(coordinates[0]);
          const latitude = Number(coordinates[1]);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null;
          }

          const distanceKm =
            getDistanceInMeters(
              location.latitude,
              location.longitude,
              latitude,
              longitude
            ) / 1000;

          if (distanceKm > MONITORED_HAZARD_RANGE_KM) {
            return null;
          }

          return {
            distanceKm,
            hazard: buildEarthquakeHazardDetail(
              earthquake,
              latitude,
              longitude,
              distanceKm
            ),
          };
        })
        .filter(
          (
            item
          ): item is {
            distanceKm: number;
            hazard: SelectedHazardDetail;
          } => item !== null
        )
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(item => item.hazard);
    }

    if (filter === 'floods') {
      const eonetFloods =
        disasterEvents
          .map((event) => {
            if (
              !Array.isArray(event?.geometry) ||
              event.geometry.length === 0
            ) {
              return null;
            }

            const geometry =
              event.geometry[
                event.geometry.length - 1
              ];

            if (
              geometry?.type !== 'Point' ||
              !Array.isArray(
                geometry?.coordinates
              ) ||
              geometry.coordinates.length < 2
            ) {
              return null;
            }

            const longitude = Number(
              geometry.coordinates[0]
            );
            const latitude = Number(
              geometry.coordinates[1]
            );

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null;
            }

            const category =
              event?.categories?.[0]?.title ??
              'Natural Event';

            if (
              getEonetFilterKey(
                category
              ) !== 'floods'
            ) {
              return null;
            }

            const distanceKm =
              getDistanceInMeters(
                location.latitude,
                location.longitude,
                latitude,
                longitude
              ) / 1000;

            if (
              distanceKm >
              MONITORED_HAZARD_RANGE_KM
            ) {
              return null;
            }

            return {
              distanceKm,
              hazard:
                buildEonetHazardDetail(
                  event,
                  latitude,
                  longitude,
                  distanceKm
                ),
            };
          })
          .filter(
            (
              item
            ): item is {
              distanceKm: number;
              hazard: SelectedHazardDetail;
            } => item !== null
          );

      const gdacsFloodHazards =
        gdacsFloods
          .map((feature) => {
            const point =
              getGdacsFloodPoint(
                feature
              );

            if (!point) {
              return null;
            }

            const distanceKm =
              getDistanceInMeters(
                location.latitude,
                location.longitude,
                point.latitude,
                point.longitude
              ) / 1000;

            if (
              distanceKm >
              MONITORED_HAZARD_RANGE_KM
            ) {
              return null;
            }

            return {
              distanceKm,
              hazard:
                buildGdacsFloodHazardDetail(
                  feature,
                  point.latitude,
                  point.longitude,
                  distanceKm
                ),
            };
          })
          .filter(
            (
              item
            ): item is {
              distanceKm: number;
              hazard: SelectedHazardDetail;
            } => item !== null
          );

      const localFloodRiskHazard =
        buildLocalWeatherMatchedHazard(
          'floods'
        );

      const combinedFloodHazards = [
        ...(localFloodRiskHazard
          ? [
              {
                distanceKm: 0,
                hazard: localFloodRiskHazard,
              },
            ]
          : []),
        ...eonetFloods,
        ...gdacsFloodHazards,
      ];

      return combinedFloodHazards
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        )
        .map(
          item => item.hazard
        );
    }


    if (filter === 'weatherRisk') {
      if (riskLevel === 'Unavailable') {
        return [];
      }

      return [
        {
          id: 'local-weather-risk',
          filterKey: 'weatherRisk',
          icon: '🌦️',
          category: 'Local Weather Risk',
          title: `Weather risk: ${riskLevel}`,
          source: 'Open-Meteo',
          latitude: location.latitude,
          longitude: location.longitude,
          distanceText: 'At your location',
          detailLines: [
            weatherRiskDetails,
            'This is an Alerta Ready risk classification, not an official weather warning.',
          ],
        },
      ];
    }

    if (filter === 'airQuality') {
      if (!hasAirQualityData) {
        return [];
      }

      return [
        {
          id: 'local-air-quality',
          filterKey: 'airQuality',
          icon: '🌫️',
          category: 'Air Quality / Haze',
          title: `AQI ${Math.round(
            airQuality.usAqi
          )} • ${airQuality.usAqiLabel}`,
          source: 'Open-Meteo / CAMS',
          latitude: location.latitude,
          longitude: location.longitude,
          distanceText: 'At your location',
          detailLines: [
            `PM2.5: ${airQuality.pm25.toFixed(1)} µg/m³`,
            `PM10: ${airQuality.pm10.toFixed(1)} µg/m³`,
            `Aerosol optical depth: ${airQuality.aerosolOpticalDepth.toFixed(2)}`,
          ],
        },
      ];
    }

    if (
      filter === 'shelters' ||
      filter === 'hospitals'
    ) {
      return [];
    }

    const localMatchedHazard =
      buildLocalWeatherMatchedHazard(
        filter
      );

    const externalHazards = disasterEvents
      .map((event) => {
        if (
          !Array.isArray(event?.geometry) ||
          event.geometry.length === 0
        ) {
          return null;
        }

        const geometry =
          event.geometry[event.geometry.length - 1];

        if (
          geometry?.type !== 'Point' ||
          !Array.isArray(geometry?.coordinates) ||
          geometry.coordinates.length < 2
        ) {
          return null;
        }

        const longitude = Number(
          geometry.coordinates[0]
        );
        const latitude = Number(
          geometry.coordinates[1]
        );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        const category =
          event?.categories?.[0]?.title ??
          'Natural Event';

        if (getEonetFilterKey(category) !== filter) {
          return null;
        }

        const distanceKm =
          getDistanceInMeters(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          ) / 1000;

        if (distanceKm > MONITORED_HAZARD_RANGE_KM) {
          return null;
        }

        return {
          distanceKm,
          hazard: buildEonetHazardDetail(
            event,
            latitude,
            longitude,
            distanceKm
          ),
        };
      })
      .filter(
        (
          item
        ): item is {
          distanceKm: number;
          hazard: SelectedHazardDetail;
        } => item !== null
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(item => item.hazard);

    return [
      ...(localMatchedHazard
        ? [localMatchedHazard]
        : []),
      ...externalHazards,
    ];
  }

  function animateToHazard(
    hazard: SelectedHazardDetail
  ) {
    // Zoom out enough to show the selected marker together with the
    // 25 km contextual circle drawn around it.
    mapRef.current?.animateToRegion(
      {
        latitude: hazard.latitude,
        longitude: hazard.longitude,
        latitudeDelta: 0.65,
        longitudeDelta: 0.65,
      },
      650
    );
  }

  function focusSelectedHazard(
    hazard: SelectedHazardDetail,
    hazards?: SelectedHazardDetail[]
  ) {
    const sourceCollection =
      hazards && hazards.length > 0
        ? hazards
        : [hazard];

    // De-duplicate API results while preserving nearest-first ordering.
    const seen = new Set<string>();
    const collection = sourceCollection.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });

    const index = Math.max(
      0,
      collection.findIndex(item => item.id === hazard.id)
    );

    setSelectedHazardCollection(collection);
    setSelectedHazardIndex(index);
    setSelectedHazard(collection[index] ?? hazard);
    setHazardListModalVisible(false);
    animateToHazard(collection[index] ?? hazard);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedHazardWeather() {
      if (!selectedHazard) {
        setSelectedHazardWeather(null);
        setSelectedHazardWeatherLoading(false);
        return;
      }

      // A local weather-risk card already represents the monitored location,
      // so reuse the existing values instead of making another request.
      if (selectedHazard.filterKey === 'weatherRisk') {
        setSelectedHazardWeather({
          riskLevel,
          details: weatherRiskDetails,
        });
        setSelectedHazardWeatherLoading(false);
        return;
      }

      setSelectedHazardWeatherLoading(true);

      const context =
        await getWeatherContextForCoordinates(
          selectedHazard.latitude,
          selectedHazard.longitude
        );

      if (!cancelled) {
        setSelectedHazardWeather(context);
        setSelectedHazardWeatherLoading(false);
      }
    }

    loadSelectedHazardWeather();

    return () => {
      cancelled = true;
    };
  }, [
    selectedHazard?.id,
    selectedHazard?.latitude,
    selectedHazard?.longitude,
    selectedHazard?.filterKey,
    riskLevel,
    weatherRiskDetails,
  ]);

  function showSelectedHazardAtIndex(
    nextIndex: number
  ) {
    if (selectedHazardCollection.length === 0) {
      return;
    }

    const count = selectedHazardCollection.length;
    const normalisedIndex =
      ((nextIndex % count) + count) % count;
    const hazard =
      selectedHazardCollection[normalisedIndex];

    setSelectedHazardIndex(normalisedIndex);
    setSelectedHazard(hazard);
    animateToHazard(hazard);
  }

  function showPreviousSelectedHazard() {
    showSelectedHazardAtIndex(
      selectedHazardIndex - 1
    );
  }

  function showNextSelectedHazard() {
    showSelectedHazardAtIndex(
      selectedHazardIndex + 1
    );
  }

  function closeSelectedHazard() {
    setSelectedHazard(null);
    setSelectedHazardCollection([]);
    setSelectedHazardIndex(0);
    setSelectedHazardWeather(null);
    setSelectedHazardWeatherLoading(false);
    setHazardListModalVisible(false);

    // Return the map to the monitored/search location so the Map, weather
    // context, facilities and coordinates all refer to the same place again.
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        450
      );
    }
  }

  // ---------------------------------------------------------
  // NASA EONET
  // Real currently open natural events
  // ---------------------------------------------------------

  async function getDisasterEvents(
    latitude: number,
    longitude: number
  ) {
    // EONET supports bounding-box queries. Bounding the API request around
    // the 50 km synchronised local monitoring area prevents a global result limit from hiding a
    // nearby event. Exact relevance is still checked locally with Haversine.
    const latitudeDelta = NEARBY_FILTER_RADIUS_KM / 111;
    const longitudeScale = Math.max(
      0.15,
      Math.cos((latitude * Math.PI) / 180)
    );
    const longitudeDelta =
      NEARBY_FILTER_RADIUS_KM / (111 * longitudeScale);

    const minLongitude = Math.max(-180, longitude - longitudeDelta);
    const maxLongitude = Math.min(180, longitude + longitudeDelta);
    const minLatitude = Math.max(-90, latitude - latitudeDelta);
    const maxLatitude = Math.min(90, latitude + latitudeDelta);

    // EONET bbox order: min longitude, max latitude, max longitude, min latitude.
    const bbox = [
      minLongitude,
      maxLatitude,
      maxLongitude,
      minLatitude,
    ].join(',');

    const EONET_URL =
      `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500&bbox=${encodeURIComponent(bbox)}`;

    try {
      let responseText = '';

      // EONET can occasionally return an empty/incomplete body.
      // Retry once and keep the previous valid map data if it fails.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(
            `${EONET_URL}&_=${Date.now()}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok) {
            console.warn(`NASA EONET request failed: ${response.status}`);
            continue;
          }

          responseText = await response.text();
          if (responseText.trim()) break;

          console.warn(
            `NASA EONET returned an empty response. Attempt ${attempt}/2.`
          );
        } catch (requestError) {
          console.warn(
            `NASA EONET request attempt ${attempt} failed:`,
            requestError
          );
        }
      }

      if (!responseText.trim()) {
        console.warn(
          'NASA EONET is temporarily unavailable. Keeping previous event data.'
        );
        return;
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(
          'NASA EONET returned invalid JSON. Keeping previous event data.',
          parseError
        );
        return;
      }

      if (!Array.isArray(data?.events)) {
        console.warn('NASA EONET response did not contain an events array.');
        return;
      }

      setDisasterEvents(data.events);
    } catch (error) {
      console.warn('NASA EONET data is temporarily unavailable:', error);
    }
  }

  // ---------------------------------------------------------
  // GDACS GLOBAL FLOOD EVENTS
  // ---------------------------------------------------------
  // GDACS provides worldwide disaster-event information. The request
  // retrieves recent flood records globally, then the Map applies the same
  // 50 km Haversine synchronised local display radius used for other event layers.
  // This complements NASA EONET and does not replace Open-Meteo weather risk.
  async function getGdacsFloodEvents() {
    const now =
      new Date();

    const from =
      new Date(
        now.getTime() -
        60 *
          24 *
          60 *
          60 *
          1000
      );

    const toDate =
      now
        .toISOString()
        .slice(0, 10);

    const fromDate =
      from
        .toISOString()
        .slice(0, 10);

    const GDACS_URL =
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH' +
      `?eventlist=FL` +
      `&fromDate=${encodeURIComponent(fromDate)}` +
      `&toDate=${encodeURIComponent(toDate)}` +
      `&alertlevel=${encodeURIComponent('Green;Orange;Red')}`;

    try {
      const response =
        await fetch(
          GDACS_URL,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );

      if (!response.ok) {
        console.warn(
          `GDACS flood request failed: ${response.status}`
        );
        return;
      }

      const responseText =
        await response.text();

      if (!responseText.trim()) {
        console.warn(
          'GDACS returned an empty flood response. Keeping previous GDACS data.'
        );
        return;
      }

      let data: any;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch (parseError) {
        console.warn(
          'GDACS returned invalid JSON. Keeping previous GDACS flood data.',
          parseError
        );
        return;
      }

      if (
        !Array.isArray(
          data?.features
        )
      ) {
        console.warn(
          'GDACS response did not contain a GeoJSON features array.'
        );
        return;
      }

      const floodFeatures =
        data.features.filter(
          (feature: any) => {
            const properties =
              feature?.properties ?? {};

            const eventType =
              String(
                properties.eventtype ??
                properties.eventType ??
                ''
              ).toUpperCase();

            return (
              !eventType ||
              eventType === 'FL'
            );
          }
        );

      setGdacsFloods(
        floodFeatures
      );

      console.log(
        `GDACS global flood events loaded: ${floodFeatures.length}`
      );
    } catch (error) {
      console.warn(
        'GDACS global flood data is temporarily unavailable:',
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
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `USGS request failed: ${response.status}`
        );
        return;
      }

      const responseText = await response.text();

      if (!responseText.trim()) {
        console.warn(
          'USGS returned an empty response. Keeping previous earthquake data.'
        );
        return;
      }

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(
          'USGS returned invalid JSON. Keeping previous earthquake data.',
          parseError
        );
        return;
      }

      if (!Array.isArray(data?.features)) {
        console.warn(
          'USGS response did not contain a features array.'
        );
        return;
      }

      setEarthquakes(data.features);
    } catch (error) {
      console.warn(
        'USGS earthquake data is temporarily unavailable:',
        error
      );
    }
  }

  // ---------------------------------------------------------
  // USER LOCATION + GOOGLE PLACES + OPEN-METEO
  // ---------------------------------------------------------

  async function getUserLocation(
    overrideArea?: {
      latitude: number;
      longitude: number;
      label?: string;
    }
  ) {
    let areaCoords: Location.LocationObjectCoords;

    if (overrideArea) {
      areaCoords = {
        latitude: overrideArea.latitude,
        longitude: overrideArea.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };

      setActiveAreaLabel(
        overrideArea.label?.trim() ||
          'Searched area'
      );
    } else {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission denied',
          'Location permission is required to use your current location.'
        );

        return;
      }

      try {
        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.Balanced,
          });

        areaCoords =
          currentLocation.coords;

        setActiveAreaLabel(
          'Current location'
        );
      } catch (locationError) {
        console.error(
          'Location error:',
          locationError
        );

        const fallbackLocation: Location.LocationObjectCoords = {
          latitude: 1.3521,
          longitude: 103.8198,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        };

        areaCoords = fallbackLocation;
        setActiveAreaLabel('Demo Singapore area');

        Alert.alert(
          'Demo Location Used',
          'Current GPS location is unavailable, so the app is using a simulated Singapore location for the prototype demo.'
        );
      }
    }

    try {
      setLocation(areaCoords);

      // Always move the map camera directly to the loaded area.
      // This is important for the locate/recenter button because if the GPS
      // coordinates are the same as the existing state value, React may not
      // trigger the location-dependent useEffect again.
      mapRef.current?.animateToRegion(
        {
          latitude: areaCoords.latitude,
          longitude: areaCoords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        450
      );

      // A refreshed GPS location changes the user's monitored area, so close
      // any hazard that was selected using the previous location/data set.
      setSelectedHazard(null);
      setSelectedHazardCollection([]);
      setSelectedHazardIndex(0);
      setHazardListModalVisible(false);

      // Reverse geocoding is used only to choose better local-language
      // shelter search terms. If it fails, the global English terms are
      // still used, so shelter discovery continues to work worldwide.
      let detectedCountryCode: string | null = null;

      try {
        const geocoded =
          await Location.reverseGeocodeAsync({
            latitude:
              areaCoords.latitude,
            longitude:
              areaCoords.longitude,
          });

        detectedCountryCode =
          geocoded?.[0]?.isoCountryCode
            ?.toUpperCase() ?? null;

        console.log(
          'Shelter search country code:',
          detectedCountryCode ?? 'unknown'
        );
      } catch (reverseGeocodeError) {
        console.warn(
          'Reverse geocoding unavailable; using global shelter search terms:',
          reverseGeocodeError
        );
      }

      // Clear location-dependent results immediately so a previous city's
      // hazards/conditions are never shown while the new requests are running.
      setDisasterEvents([]);
      setRiskLevel('Unavailable');
      setWeatherRiskDetails('Weather risk data unavailable.');
      setHasAirQualityData(false);
      setAirQuality({
        usAqi: 0,
        pm25: 0,
        pm10: 0,
        aerosolOpticalDepth: 0,
        usAqiLabel: 'Unavailable',
      });

      getDisasterEvents(
        areaCoords.latitude,
        areaCoords.longitude
      );

      getGdacsFloodEvents();

      if (
        isGenericIndonesiaCentroid(
          areaCoords.latitude,
          areaCoords.longitude
        )
      ) {
        Alert.alert(
          'Choose a specific city location',
          'Your emulator is currently using the generic centre coordinate for Indonesia, not a real city/neighbourhood. Nearby hospitals, shelters and directions can therefore be misleading. In Android Emulator Location, choose a specific city or enter exact coordinates (for example Palu, Jakarta or Palangka Raya), then tap the location refresh button.'
        );
      }

      // Clear results from the previous GPS location immediately.
      // This prevents stale hospitals/shelters from another city
      // being displayed while the new requests are running.
      setHospitals([]);
      setShelters([]);

      // -----------------------------------------------------
      // GOOGLE PLACES - NEAREST HOSPITALS
      // -----------------------------------------------------
      //
      // rankby=distance asks Google Places to order results by
      // proximity to the current coordinates. No radius is used
      // with rankby=distance.
      // -----------------------------------------------------

      try {
        const latitude =
          areaCoords.latitude;

        const longitude =
          areaCoords.longitude;

        const hospitalResponse =
          await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&rankby=distance&type=hospital&key=${GOOGLE_PLACES_API_KEY}`
          );

        const hospitalData =
          await hospitalResponse.json();

        if (
          hospitalData?.status !== 'OK' &&
          hospitalData?.status !== 'ZERO_RESULTS'
        ) {
          console.warn(
            'Google Places hospital status:',
            hospitalData?.status,
            hospitalData?.error_message ?? ''
          );
        }

        const rawHospitalResults =
          Array.isArray(
            hospitalData?.results
          )
            ? hospitalData.results
            : [];

        const filteredHospitals =
          rawHospitalResults.filter(
            (place: any) => {
              if (!isLikelyHospital(place)) {
                return false;
              }

              const placeLatitude = Number(
                place?.geometry?.location?.lat
              );
              const placeLongitude = Number(
                place?.geometry?.location?.lng
              );

              if (
                !Number.isFinite(placeLatitude) ||
                !Number.isFinite(placeLongitude)
              ) {
                return false;
              }

              const distanceKm =
                getDistanceInMeters(
                  latitude,
                  longitude,
                  placeLatitude,
                  placeLongitude
                ) / 1000;

              return distanceKm <= EMERGENCY_LOCATION_MAX_KM;
            }
          );

        console.log(
          'Validated nearest hospital results:',
          filteredHospitals.map(
            (place: any) => ({
              name: place?.name,
              vicinity: place?.vicinity,
              types: place?.types,
            })
          )
        );

        setHospitals(
          filteredHospitals
        );
      } catch (error) {
        console.warn(
          'Hospital API error:',
          error
        );

        setHospitals([]);
      }

      // -----------------------------------------------------
      // GOOGLE PLACES - GLOBAL SHELTER DISCOVERY
      // -----------------------------------------------------
      // There is no single worldwide official shelter database exposed
      // through Google Places. Alerta Ready therefore:
      // 1) detects the current country when possible,
      // 2) searches several local/international shelter terms,
      // 3) rejects non-disaster meanings such as animal/bus shelters,
      // 4) requires explicit shelter/evacuation wording in the returned
      //    place name or address,
      // 5) keeps only results inside the app-defined 50 km facility range.
      // -----------------------------------------------------

      try {
        const latitude =
          areaCoords.latitude;

        const longitude =
          areaCoords.longitude;

        const shelterKeywords =
          getGlobalShelterSearchTerms(
            detectedCountryCode
          );

        const shelterResponses =
          await Promise.all(
            shelterKeywords.map(
              async keyword => {
                try {
                  const response =
                    await fetch(
                      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&rankby=distance&keyword=${encodeURIComponent(
                        keyword
                      )}&key=${GOOGLE_PLACES_API_KEY}`
                    );

                  const data =
                    await response.json();

                  if (
                    data?.status !== 'OK' &&
                    data?.status !== 'ZERO_RESULTS'
                  ) {
                    console.warn(
                      `Google Places shelter status for "${keyword}":`,
                      data?.status,
                      data?.error_message ?? ''
                    );
                  }

                  const results =
                    Array.isArray(
                      data?.results
                    )
                      ? data.results
                      : [];

                  return results.map(
                    (place: any) => ({
                      ...place,
                      matchedShelterQuery:
                        keyword,
                    })
                  );
                } catch (requestError) {
                  console.warn(
                    `Shelter search failed for "${keyword}":`,
                    requestError
                  );
                  return [];
                }
              }
            )
          );

        let rawShelterResults =
          shelterResponses.flat();

        const buildValidatedShelters =
          (places: any[]) =>
            dedupePlaces(places)
              .filter(
                (place: any) => {
                  if (
                    !isLikelyEmergencyShelter(
                      place
                    )
                  ) {
                    return false;
                  }

                  const placeLatitude =
                    Number(
                      place?.geometry
                        ?.location?.lat
                    );

                  const placeLongitude =
                    Number(
                      place?.geometry
                        ?.location?.lng
                    );

                  if (
                    !Number.isFinite(
                      placeLatitude
                    ) ||
                    !Number.isFinite(
                      placeLongitude
                    )
                  ) {
                    return false;
                  }

                  const distanceKm =
                    getDistanceInMeters(
                      latitude,
                      longitude,
                      placeLatitude,
                      placeLongitude
                    ) / 1000;

                  return (
                    distanceKm <=
                    EMERGENCY_LOCATION_MAX_KM
                  );
                }
              )
              .map((place: any) => {
                const placeLatitude =
                  Number(
                    place?.geometry
                      ?.location?.lat
                  );

                const placeLongitude =
                  Number(
                    place?.geometry
                      ?.location?.lng
                  );

                const distanceKm =
                  getDistanceInMeters(
                    latitude,
                    longitude,
                    placeLatitude,
                    placeLongitude
                  ) / 1000;

                return {
                  ...place,
                  distanceKm,
                  shelterKind:
                    'emergency-evacuation',
                };
              })
              .sort(
                (a: any, b: any) =>
                  a.distanceKm -
                  b.distanceKm
              );

        let validatedShelters =
          buildValidatedShelters(
            rawShelterResults
          );

        // If Nearby Search returned no verified shelter, try Text Search
        // with the strongest local/global terms. The same validation is
        // applied afterwards, so this does not lower the accuracy filter.
        if (
          validatedShelters.length === 0
        ) {
          const fallbackTerms =
            shelterKeywords.slice(0, 3);

          const fallbackResponses =
            await Promise.all(
              fallbackTerms.map(
                async keyword => {
                  try {
                    const response =
                      await fetch(
                        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
                          keyword
                        )}&location=${latitude},${longitude}&radius=${
                          EMERGENCY_LOCATION_MAX_KM *
                          1000
                        }&key=${GOOGLE_PLACES_API_KEY}`
                      );

                    const data =
                      await response.json();

                    if (
                      data?.status !== 'OK' &&
                      data?.status !==
                        'ZERO_RESULTS'
                    ) {
                      console.warn(
                        `Google Places shelter text-search status for "${keyword}":`,
                        data?.status,
                        data?.error_message ?? ''
                      );
                    }

                    const results =
                      Array.isArray(
                        data?.results
                      )
                        ? data.results
                        : [];

                    return results.map(
                      (place: any) => ({
                        ...place,
                        matchedShelterQuery:
                          keyword,
                      })
                    );
                  } catch (fallbackError) {
                    console.warn(
                      `Shelter text-search fallback failed for "${keyword}":`,
                      fallbackError
                    );
                    return [];
                  }
                }
              )
            );

          rawShelterResults = [
            ...rawShelterResults,
            ...fallbackResponses.flat(),
          ];

          validatedShelters =
            buildValidatedShelters(
              rawShelterResults
            );
        }

        console.log(
          'Validated global emergency / evacuation shelter results:',
          validatedShelters.map(
            (place: any) => ({
              name: place?.name,
              vicinity:
                place?.vicinity,
              distanceKm:
                place?.distanceKm,
              matchedQuery:
                place?.matchedShelterQuery,
            })
          )
        );

        setShelters(
          validatedShelters
        );
      } catch (error) {
        console.warn(
          'Global shelter API error:',
          error
        );

        setShelters([]);
      }

      // -----------------------------------------------------
      // OPEN-METEO MULTI-VARIABLE WEATHER CONTEXT
      // Detailed weather is shown on the Dashboard. The Map only
      // keeps the overall contextual risk status for hazard awareness.
      // These are Alerta Ready-defined indicators, not official warnings.
      // -----------------------------------------------------

      try {
        const latitude = areaCoords.latitude;
        const longitude = areaCoords.longitude;

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

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${weatherVariables}&forecast_hours=1&wind_speed_unit=kmh&timezone=auto`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!weatherResponse.ok) {
          console.warn(
            `Open-Meteo request failed: ${weatherResponse.status}`
          );
        } else {
          const responseText = await weatherResponse.text();

          if (!responseText.trim()) {
            console.warn(
              'Open-Meteo returned an empty response.'
            );
          } else {
            let weatherData: any = null;

            try {
              weatherData = JSON.parse(responseText);
            } catch (parseError) {
              console.warn(
                'Open-Meteo returned invalid JSON:',
                parseError
              );
            }

            if (weatherData) {
              const rain = Number(
                weatherData?.hourly?.rain?.[0] ?? 0
              );

              const precipitation = Number(
                weatherData?.hourly?.precipitation?.[0] ?? 0
              );

              const precipitationProbability = Number(
                weatherData?.hourly?.precipitation_probability?.[0] ?? 0
              );

              const soilMoisture = Number(
                weatherData?.hourly?.soil_moisture_0_to_1cm?.[0] ?? 0
              );

              const windSpeed = Number(
                weatherData?.hourly?.wind_speed_10m?.[0] ?? 0
              );

              const windGusts = Number(
                weatherData?.hourly?.wind_gusts_10m?.[0] ?? 0
              );

              const temperature = Number(
                weatherData?.hourly?.temperature_2m?.[0] ?? 0
              );

              const apparentTemperature = Number(
                weatherData?.hourly?.apparent_temperature?.[0] ?? 0
              );

              const rainFloodRisk =
                rain >= 10 ||
                precipitation >= 10 ||
                precipitationProbability >= 80 ||
                (soilMoisture >= 0.45 && precipitationProbability >= 60)
                  ? 'High Risk'
                  : rain >= 3 ||
                      precipitation >= 3 ||
                      precipitationProbability >= 50 ||
                      (soilMoisture >= 0.35 && precipitationProbability >= 40)
                    ? 'Moderate Risk'
                    : 'Low Risk';

              const windRisk =
                windSpeed >= 60 || windGusts >= 75
                  ? 'High Risk'
                  : windSpeed >= 40 || windGusts >= 50
                    ? 'Moderate Risk'
                    : 'Low Risk';

              const hottest = Math.max(
                temperature,
                apparentTemperature
              );

              const coldest = Math.min(
                temperature,
                apparentTemperature
              );

              const temperatureRisk =
                hottest >= 40 || coldest <= 0
                  ? 'High Risk'
                  : hottest >= 35 || coldest <= 5
                    ? 'Moderate Risk'
                    : 'Low Risk';

              const risks = [
                rainFloodRisk,
                windRisk,
                temperatureRisk,
              ];

              const overallRisk = risks.includes('High Risk')
                ? 'High Risk'
                : risks.includes('Moderate Risk')
                  ? 'Moderate Risk'
                  : 'Low Risk';

              const weatherIndicators: string[] = [];

              if (rainFloodRisk !== 'Low Risk') {
                weatherIndicators.push(
                  `${rainFloodRisk.toLowerCase()} rain / flood-related conditions`
                );
              }

              if (windRisk !== 'Low Risk') {
                weatherIndicators.push(
                  `${windRisk.toLowerCase()} wind / gust conditions`
                );
              }

              if (temperatureRisk !== 'Low Risk') {
                weatherIndicators.push(
                  `${temperatureRisk.toLowerCase()} temperature conditions`
                );
              }

              setRiskLevel(overallRisk);
              setWeatherHazardRisks({
                rainFloodRisk,
                windRisk,
                temperatureRisk,
              });
              setWeatherMetrics({
                rain,
                precipitation,
                precipitationProbability,
                soilMoisture,
                windSpeed,
                windGusts,
                temperature,
                apparentTemperature,
              });
              setWeatherRiskDetails(
                weatherIndicators.length > 0
                  ? `Alerta Ready detected ${weatherIndicators.join(', ')}.`
                  : 'No elevated weather indicators detected.'
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          'Open-Meteo weather data is temporarily unavailable:',
          error
        );
      }

      // -----------------------------------------------------
      // OPEN-METEO AIR QUALITY / HAZE CONTEXT
      // NASA EONET is a curated natural-event feed and may not
      // list local haze, so local haze is checked separately.
      // -----------------------------------------------------
      try {
        const latitude =
          areaCoords.latitude;

        const longitude =
          areaCoords.longitude;

        const aqResponse = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10,aerosol_optical_depth,us_aqi&timezone=auto`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!aqResponse.ok) {
          console.warn(
            `Open-Meteo air-quality request failed: ${aqResponse.status}`
          );
        } else {
          const aqText =
            await aqResponse.text();

          if (!aqText.trim()) {
            console.warn(
              'Open-Meteo air-quality API returned an empty response.'
            );
          } else {
            let aqData: any = null;

            try {
              aqData =
                JSON.parse(aqText);
            } catch (parseError) {
              console.warn(
                'Open-Meteo air-quality API returned invalid JSON:',
                parseError
              );
            }

            if (aqData?.current) {
              const usAqi = Number(
                aqData.current.us_aqi ?? 0
              );

              const pm25 = Number(
                aqData.current.pm2_5 ?? 0
              );

              const pm10 = Number(
                aqData.current.pm10 ?? 0
              );

              const aerosolOpticalDepth = Number(
                aqData.current
                  .aerosol_optical_depth ?? 0
              );

              const usAqiLabel =
                getUsAqiLabel(usAqi);

              setAirQuality({
                usAqi,
                pm25,
                pm10,
                aerosolOpticalDepth,
                usAqiLabel,
              });
              setHasAirQualityData(true);

              console.log(
                'Open-Meteo air quality:',
                {
                  usAqi,
                  pm25,
                  pm10,
                  aerosolOpticalDepth,
                  usAqiLabel,
                }
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          'Open-Meteo air-quality data is temporarily unavailable:',
          error
        );
      }
    } catch (error) {
      console.error(
        'Map area loading error:',
        error
      );

      Alert.alert(
        'Map data unavailable',
        'Alerta Ready could not finish loading data for this area. Please try again.'
      );
    }
  }

  async function recenterToCurrentLocation() {
    if (recenterLoading) {
      return;
    }

    setRecenterLoading(true);

    try {
      // Check whether Android/iOS location services are actually enabled.
      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          'Location services are off',
          'Turn on location services on your device or emulator, then try again.'
        );
        return;
      }

      // Re-check permission rather than assuming the permission granted during
      // the first Map load is still available.
      let permission =
        await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        permission =
          await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Allow location access to return the map to your current position.'
        );
        return;
      }

      let currentLocation:
        | Location.LocationObject
        | null = null;

      // Prefer a fresh GPS result.
      try {
        currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
      } catch (freshLocationError) {
        console.warn(
          'Fresh GPS position unavailable. Trying last known position:',
          freshLocationError
        );

        // A last-known position is better than leaving the recenter button
        // apparently unresponsive, especially on an Android emulator.
        currentLocation =
          await Location.getLastKnownPositionAsync();
      }

      if (!currentLocation) {
        Alert.alert(
          'Current location unavailable',
          'No current or recent GPS position is available. Set a location in the Android Emulator location controls or enable GPS on the device, then try again.'
        );
        return;
      }

      const currentCoords =
        currentLocation.coords;

      // Clear a searched city / selected hazard first so all UI context returns
      // to the device GPS position.
      setSearchQuery('');
      setSelectedHazard(null);
      setSelectedHazardCollection([]);
      setSelectedHazardIndex(0);
      setHazardListModalVisible(false);

      // Move immediately so the user gets visible feedback from the button.
      mapRef.current?.animateToRegion(
        {
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        350
      );

      // Reload hospitals, shelters, weather, hazards and map context around the
      // actual device position using the existing data-loading pipeline.
      await getUserLocation({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        label: 'Current location',
      });
    } catch (error) {
      console.error(
        'Recenter location error:',
        error
      );

      Alert.alert(
        'Unable to locate you',
        'Alerta Ready could not obtain your current GPS position. Check location services and try again.'
      );
    } finally {
      setRecenterLoading(false);
    }
  }

  async function searchMapArea() {
    const query = searchQuery.trim();

    setShowSearchSuggestions(false);
    setSearchSuggestions([]);

    if (!query) {
      Alert.alert(
        'Search an area',
        'Enter a city, neighbourhood, landmark or address first.'
      );
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&key=${GOOGLE_PLACES_API_KEY}`
      );

      const data = await response.json();

      if (data?.status === 'ZERO_RESULTS') {
        Alert.alert(
          'Area not found',
          'Try a more specific city, neighbourhood, landmark or address.'
        );
        return;
      }

      if (
        data?.status !== 'OK' ||
        !Array.isArray(data?.results) ||
        data.results.length === 0
      ) {
        console.warn(
          'Google Places area search status:',
          data?.status,
          data?.error_message ?? ''
        );

        Alert.alert(
          'Search unavailable',
          data?.error_message ||
            'Google Places could not search this area. Check that Places API is enabled for your API key.'
        );
        return;
      }

      const result = data.results.find(
        (item: any) =>
          Number.isFinite(
            Number(
              item?.geometry?.location?.lat
            )
          ) &&
          Number.isFinite(
            Number(
              item?.geometry?.location?.lng
            )
          )
      );

      if (!result) {
        Alert.alert(
          'Area not found',
          'The search result did not include valid map coordinates.'
        );
        return;
      }

      const latitude = Number(
        result.geometry.location.lat
      );

      const longitude = Number(
        result.geometry.location.lng
      );

      const label = String(
        result.name ||
          result.formatted_address ||
          query
      );

      setSearchQuery(label);

      await getUserLocation({
        latitude,
        longitude,
        label,
      });
    } catch (error) {
      console.warn(
        'Area search error:',
        error
      );

      Alert.alert(
        'Search failed',
        'Alerta Ready could not search this area. Check your internet connection and try again.'
      );
    } finally {
      setSearchLoading(false);
    }
  }

  // ---------------------------------------------------------
  // DIRECTIONS
  // ---------------------------------------------------------

  async function handleDirections(
    place: any,
    placeType: 'shelter' | 'hospital'
  ) {
    if (!location) {
      Alert.alert(
        'Location unavailable',
        'Your current location is not available yet. Refresh your location and try again.'
      );
      return;
    }

    const placeId =
      String(place?.place_id ?? '');

    if (!placeId) {
      Alert.alert(
        'Directions unavailable',
        'Google Places did not return a valid Place ID for this location, so Alerta Ready will not guess the destination.'
      );
      return;
    }

    try {
      // -----------------------------------------------------
      // 1. REFRESH ORIGIN
      // -----------------------------------------------------
      // Use the latest emulator/device GPS coordinates rather than
      // relying on an older location value stored in state.
      let originLatitude =
        location.latitude;

      let originLongitude =
        location.longitude;

      try {
        const freshLocation =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.Balanced,
          });

        originLatitude =
          freshLocation.coords.latitude;

        originLongitude =
          freshLocation.coords.longitude;

      } catch (locationError) {
        console.warn(
          'Could not refresh location before directions. Using current map location.',
          locationError
        );
      }

      // -----------------------------------------------------
      // 2. VERIFY THE SELECTED GOOGLE PLACE
      // -----------------------------------------------------
      // Nearby Search is used for discovery, but before opening
      // directions we resolve the Place ID again with Place Details.
      // This gives us Google's canonical name, address and coordinates.
      const detailsResponse =
        await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId
          )}&fields=place_id,name,formatted_address,geometry,business_status,types&key=${GOOGLE_PLACES_API_KEY}`
        );

      const detailsData =
        await detailsResponse.json();

      if (
        detailsData?.status !== 'OK' ||
        !detailsData?.result
      ) {
        console.warn(
          'Google Place Details failed:',
          detailsData?.status,
          detailsData?.error_message ?? ''
        );

        Alert.alert(
          'Directions unavailable',
          'Google Maps could not verify this emergency location.'
        );
        return;
      }

      const verifiedPlace =
        detailsData.result;

      const destinationLatitude =
        Number(
          verifiedPlace?.geometry
            ?.location?.lat
        );

      const destinationLongitude =
        Number(
          verifiedPlace?.geometry
            ?.location?.lng
        );

      if (
        !Number.isFinite(
          destinationLatitude
        ) ||
        !Number.isFinite(
          destinationLongitude
        )
      ) {
        Alert.alert(
          'Directions unavailable',
          'Google Maps did not return valid coordinates for this place.'
        );
        return;
      }

      // -----------------------------------------------------
      // 3. VALIDATE CATEGORY AGAIN
      // -----------------------------------------------------
      if (
        placeType === 'hospital'
      ) {
        const verifiedTypes =
          Array.isArray(
            verifiedPlace?.types
          )
            ? verifiedPlace.types
            : [];

        if (
          !verifiedTypes.includes(
            'hospital'
          )
        ) {
          Alert.alert(
            'Location not verified',
            `${verifiedPlace?.name ?? 'This place'} is not classified as a hospital by Google Places.`
          );
          return;
        }
      }

      if (
        placeType === 'shelter'
      ) {
        const shelterCandidate = {
          ...verifiedPlace,
          vicinity:
            verifiedPlace
              ?.formatted_address ??
            '',
        };

        if (
          !isLikelyEmergencyShelter(
            shelterCandidate
          )
        ) {
          Alert.alert(
            'Location not verified',
            `${verifiedPlace?.name ?? 'This place'} could not be verified as an emergency or evacuation shelter.`
          );
          return;
        }
      }

      // -----------------------------------------------------
      // 4. DISTANCE SANITY CHECK
      // -----------------------------------------------------
      const distanceKm =
        getDistanceInMeters(
          originLatitude,
          originLongitude,
          destinationLatitude,
          destinationLongitude
        ) / 1000;

      if (
        distanceKm >
        EMERGENCY_LOCATION_MAX_KM
      ) {
        Alert.alert(
          'Directions unavailable',
          `This ${placeType} is ${distanceKm.toFixed(
            1
          )} km away, so it is outside Alerta Ready's nearby-location range.`
        );
        return;
      }

      const verifiedName =
        String(
          verifiedPlace?.name ??
            (placeType === 'shelter'
              ? 'Emergency / evacuation shelter'
              : 'Hospital')
        );

      const verifiedAddress =
        String(
          verifiedPlace
            ?.formatted_address ??
            'Address unavailable'
        );

      /*
       * Use BOTH:
       * - explicit current GPS coordinates for the origin
       * - Google's verified Place ID for the destination
       *
       * A raw destination lat/lng can be reverse-geocoded by Google
       * Maps to a nearby Plus Code or road. A Place ID identifies the
       * actual POI/business/facility selected from Google Places.
       */
      const googleMapsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${originLatitude},${originLongitude}` +
        `&destination=${encodeURIComponent(
          verifiedName
        )}` +
        `&destination_place_id=${encodeURIComponent(
          placeId
        )}` +
        `&travelmode=driving`;

      console.log(
        'Verified Google Maps destination:',
        {
          placeType,
          placeId,
          name:
            verifiedName,
          address:
            verifiedAddress,
          origin: {
            latitude:
              originLatitude,
            longitude:
              originLongitude,
          },
          destination: {
            latitude:
              destinationLatitude,
            longitude:
              destinationLongitude,
          },
          distanceKm,
        }
      );

      // If Google says the destination is essentially at the current
      // GPS point, don't pretend there is a route to travel.
      if (distanceKm < 0.03) {
        Alert.alert(
          verifiedName,
          `${verifiedAddress}\n\nThis place is within about 30 m of your current GPS location, so Google Maps may show a 0 m route.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open in Maps',
              onPress: async () => {
                const placeUrl =
                  `https://www.google.com/maps/search/?api=1` +
                  `&query=${encodeURIComponent(
                    verifiedName
                  )}` +
                  `&query_place_id=${encodeURIComponent(
                    placeId
                  )}`;

                await Linking.openURL(
                  placeUrl
                );
              },
            },
          ]
        );
        return;
      }

      const supported =
        await Linking.canOpenURL(
          googleMapsUrl
        );

      if (!supported) {
        Alert.alert(
          'Directions unavailable',
          `Unable to open directions to ${verifiedName}.`
        );
        return;
      }

      await Linking.openURL(
        googleMapsUrl
      );
    } catch (error) {
      console.error(
        'Directions verification error:',
        error
      );

      Alert.alert(
        'Directions unavailable',
        'Alerta Ready could not verify this destination with Google Maps.'
      );
    }
  }

  async function searchEmergencyLocationInMaps(
    placeType: 'shelter' | 'hospital'
  ) {
    if (!location) {
      Alert.alert(
        'Location unavailable',
        'Refresh your current location and try again.'
      );
      return;
    }

    const query =
      placeType === 'shelter'
        ? 'evacuation center emergency shelter'
        : 'hospital';

    // Use an Android geo URI so Google Maps biases the search around
    // the same coordinates currently shown in Alerta Ready.
    const mapsUrl =
      `geo:${location.latitude},${location.longitude}` +
      `?q=${encodeURIComponent(query)}`;

    try {
      const supported =
        await Linking.canOpenURL(mapsUrl);

      if (!supported) {
        Alert.alert(
          'Maps search unavailable',
          'Google Maps could not be opened.'
        );
        return;
      }

      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.warn(
        'Google Maps search error:',
        error
      );

      Alert.alert(
        'Maps search unavailable',
        'Unable to search Google Maps for this emergency location.'
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

  const hasWeatherHazard =
    riskLevel === 'High Risk';

  const hasLocalAirQualityHazard =
    airQuality.usAqi >= 151;

  // ---------------------------------------------------------
  // PERSISTENT SAFETY ALERT
  // ---------------------------------------------------------
  // Filters control optional map layers and browse cards only.
  // A nearby hazard detected by Alerta Ready's relevance rules remains visible
  // even when the corresponding filter is switched off.
  // ---------------------------------------------------------

  const nearbyEonetSourceEvent =
    nearbyEonetHazard
      ? disasterEvents.find(
          (event) =>
            String(event?.id ?? '') ===
            String(nearbyEonetHazard.id ?? '')
        ) ?? null
      : null;

  const nearbyEarthquakeSource =
    nearbyEarthquakeHazard
      ? earthquakes.find(
          (earthquake) =>
            String(earthquake?.id ?? '') ===
            String(nearbyEarthquakeHazard.id ?? '')
        ) ?? null
      : null;

  const nearbyEonetHazardDetail =
    nearbyEonetHazard && nearbyEonetSourceEvent
      ? buildEonetHazardDetail(
          nearbyEonetSourceEvent,
          nearbyEonetHazard.latitude,
          nearbyEonetHazard.longitude,
          nearbyEonetHazard.distanceKm
        )
      : null;

  const nearbyEarthquakeHazardDetail =
    nearbyEarthquakeHazard && nearbyEarthquakeSource
      ? buildEarthquakeHazardDetail(
          nearbyEarthquakeSource,
          nearbyEarthquakeHazard.latitude,
          nearbyEarthquakeHazard.longitude,
          nearbyEarthquakeHazard.distanceKm
        )
      : null;

  const localAirQualityHazardDetail:
    SelectedHazardDetail | null =
    hasLocalAirQualityHazard
      ? {
          id: 'local-air-quality-alert',
          filterKey: 'airQuality',
          icon: '🌫️',
          category: 'Air Quality / Haze',
          title: `AQI ${Math.round(
            airQuality.usAqi
          )} • ${airQuality.usAqiLabel}`,
          source: 'Open-Meteo / CAMS',
          latitude: location.latitude,
          longitude: location.longitude,
          distanceText: 'At your location',
          detailLines: [
            `PM2.5: ${airQuality.pm25.toFixed(1)} µg/m³`,
            `PM10: ${airQuality.pm10.toFixed(1)} µg/m³`,
            `Aerosol optical depth: ${airQuality.aerosolOpticalDepth.toFixed(2)}`,
          ],
        }
      : null;

  const localWeatherHazardDetail:
    SelectedHazardDetail | null =
    hasWeatherHazard
      ? {
          id: 'local-weather-risk-alert',
          filterKey: 'weatherRisk',
          icon: '🌦️',
          category: 'Local Weather Risk',
          title: 'High weather-risk conditions detected',
          source: 'Open-Meteo',
          latitude: location.latitude,
          longitude: location.longitude,
          distanceText: 'At your location',
          detailLines: [
            weatherRiskDetails,
            'This is an Alerta Ready risk classification, not an official weather warning.',
          ],
        }
      : null;

  const localFloodWeatherHazard =
    buildLocalWeatherMatchedHazard(
      'floods'
    );

  const localStormWeatherHazard =
    buildLocalWeatherMatchedHazard(
      'severeStorms'
    );

  const localTemperatureWeatherHazard =
    buildLocalWeatherMatchedHazard(
      'otherNatural'
    );

  const primaryHighWeatherMatchedHazard =
    weatherHazardRisks.rainFloodRisk ===
    'High Risk'
      ? localFloodWeatherHazard
      : weatherHazardRisks.windRisk ===
          'High Risk'
        ? localStormWeatherHazard
        : weatherHazardRisks.temperatureRisk ===
            'High Risk'
          ? localTemperatureWeatherHazard
          : null;

  const activeHazard =
    primaryHighWeatherMatchedHazard
      ? {
          type:
            primaryHighWeatherMatchedHazard.category,
          title:
            primaryHighWeatherMatchedHazard.title,
          detail:
            primaryHighWeatherMatchedHazard.detailLines[0] ??
            weatherRiskDetails,
          latitude:
            primaryHighWeatherMatchedHazard.latitude,
          longitude:
            primaryHighWeatherMatchedHazard.longitude,
          source:
            primaryHighWeatherMatchedHazard.source,
          filterKey:
            primaryHighWeatherMatchedHazard.filterKey as MapFilter,
          hazardDetail:
            primaryHighWeatherMatchedHazard,
        }
      : nearbyEonetHazard
    ? {
        type: 'Natural Event',
        title: nearbyEonetHazard.title,
        detail: `${nearbyEonetHazard.category} detected ${nearbyEonetHazard.distanceKm.toFixed(0)} km away`,
        latitude: nearbyEonetHazard.latitude,
        longitude: nearbyEonetHazard.longitude,
        source: 'NASA EONET',
        filterKey: getEonetFilterKey(
          nearbyEonetHazard.category
        ),
        hazardDetail: nearbyEonetHazardDetail,
      }
    : nearbyEarthquakeHazard
      ? {
          type: 'Earthquake',
          title: `M${nearbyEarthquakeHazard.magnitude} Earthquake`,
          detail: `${nearbyEarthquakeHazard.place} • ${nearbyEarthquakeHazard.distanceKm.toFixed(0)} km away`,
          latitude: nearbyEarthquakeHazard.latitude,
          longitude: nearbyEarthquakeHazard.longitude,
          source: 'USGS',
          filterKey: 'earthquakes' as MapFilter,
          hazardDetail: nearbyEarthquakeHazardDetail,
        }
      : hasLocalAirQualityHazard
        ? {
            type: 'Air Quality',
            title: `AQI ${Math.round(
              airQuality.usAqi
            )} • ${airQuality.usAqiLabel}`,
            detail:
              `PM2.5 ${airQuality.pm25.toFixed(1)} µg/m³ • ` +
              `PM10 ${airQuality.pm10.toFixed(1)} µg/m³ • ` +
              `AOD ${airQuality.aerosolOpticalDepth.toFixed(2)}`,
            latitude: location.latitude,
            longitude: location.longitude,
            source: 'Open-Meteo / CAMS',
            filterKey: 'airQuality' as MapFilter,
            hazardDetail: localAirQualityHazardDetail,
          }
        : hasWeatherHazard
          ? {
              type: 'Weather Risk',
              title: 'High weather-risk conditions detected',
              detail: weatherRiskDetails,
              latitude: location.latitude,
              longitude: location.longitude,
              source: 'Open-Meteo',
              filterKey: 'weatherRisk' as MapFilter,
              hazardDetail: localWeatherHazardDetail,
            }
          : null;

  const nearbyShelterResults =
    shelters
      .map((place) => {
        const latitude =
          place?.geometry?.location?.lat;

        const longitude =
          place?.geometry?.location?.lng;

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number'
        ) {
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
          ...place,
          distanceKm,
        };
      })
      .filter(
        (place) =>
          place !== null &&
          place.distanceKm <=
            EMERGENCY_LOCATION_MAX_KM
      )
      .sort(
        (a, b) =>
          a!.distanceKm -
          b!.distanceKm
      );

  const nearbyHospitalResults =
    hospitals
      .map((place) => {
        const latitude =
          place?.geometry?.location?.lat;

        const longitude =
          place?.geometry?.location?.lng;

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number'
        ) {
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
          ...place,
          distanceKm,
        };
      })
      .filter(
        (place) =>
          place !== null &&
          place.distanceKm <=
            EMERGENCY_LOCATION_MAX_KM
      )
      .sort(
        (a, b) =>
          a!.distanceKm -
          b!.distanceKm
      );

  const nearestShelter =
    nearbyShelterResults[0] ??
    null;

  const nearestHospital =
    nearbyHospitalResults[0] ??
    null;

  const selectedFacilityList =
    selectedFacilityType === 'shelter'
      ? nearbyShelterResults
      : selectedFacilityType === 'hospital'
        ? nearbyHospitalResults
        : [];

  function openFacilityList(
    type: 'shelter' | 'hospital'
  ) {
    setSelectedFacilityType(type);
    setFacilityListModalVisible(true);
  }

  // App-defined range used only for the "Nearest" display cards.
  // It is not an official warning or evacuation radius.
  const MONITORED_HAZARD_RANGE_KM =
    NEARBY_FILTER_RADIUS_KM;

  // ---------------------------------------------------------
  // FULL FILTER / CARD / MARKER SYNCHRONISATION
  // ---------------------------------------------------------
  // These counts are intentionally derived from getHazardsForFilter().
  // Therefore the number in the filter sheet is the same collection used by
  // the Selected hazards cards, map markers and red contextual circles.
  //
  // Weather-linked local context:
  //   Flood / Rain Risk       -> Open-Meteo rain/flood component + EONET/GDACS
  //   Storms / Wind Risk      -> Open-Meteo wind component + EONET
  //   Other / Temperature     -> Open-Meteo temperature component + EONET
  //   Dust / Haze             -> Open-Meteo/CAMS elevated AQI + EONET
  //
  // Earthquakes, volcanoes, wildfires, landslides, drought and ice remain
  // based on their appropriate external event feeds; Open-Meteo does not
  // fabricate those events.
  type FilterGroup =
    | 'Hazard Events'
    | 'Local Conditions'
    | 'Nearby Facilities';

  const filterOptions: Array<{
    key: MapFilter;
    label: string;
    icon: string;
    count: number | string;
    group: FilterGroup;
  }> = [
    {
      key: 'wildfires',
      label: 'Wildfires',
      icon: '🔥',
      count: getHazardsForFilter('wildfires').length,
      group: 'Hazard Events',
    },
    {
      key: 'severeStorms',
      label: 'Storms / Wind Risk',
      icon: '🌪️',
      count: getHazardsForFilter('severeStorms').length,
      group: 'Hazard Events',
    },
    {
      key: 'volcanoes',
      label: 'Volcanoes',
      icon: '🌋',
      count: getHazardsForFilter('volcanoes').length,
      group: 'Hazard Events',
    },
    {
      key: 'floods',
      label: 'Flood / Rain Risk',
      icon: '🌊',
      count: getHazardsForFilter('floods').length,
      group: 'Hazard Events',
    },
    {
      key: 'earthquakes',
      label: 'Earthquakes',
      icon: '〰️',
      count: getHazardsForFilter('earthquakes').length,
      group: 'Hazard Events',
    },
    {
      key: 'landslides',
      label: 'Landslides',
      icon: '⛰️',
      count: getHazardsForFilter('landslides').length,
      group: 'Hazard Events',
    },
    {
      key: 'dustHazeEvents',
      label: 'Dust / Haze Events',
      icon: '🌫️',
      count: getHazardsForFilter('dustHazeEvents').length,
      group: 'Hazard Events',
    },
    {
      key: 'drought',
      label: 'Drought',
      icon: '🏜️',
      count: getHazardsForFilter('drought').length,
      group: 'Hazard Events',
    },
    {
      key: 'ice',
      label: 'Ice',
      icon: '🧊',
      count: getHazardsForFilter('ice').length,
      group: 'Hazard Events',
    },
    {
      key: 'otherNatural',
      label: 'Other / Temperature Risk',
      icon: '⚠️',
      count: getHazardsForFilter('otherNatural').length,
      group: 'Hazard Events',
    },
    {
      key: 'weatherRisk',
      label: 'Weather Risk',
      icon: '🌦️',
      count: riskLevel,
      group: 'Local Conditions',
    },
    {
      key: 'airQuality',
      label: 'Air Quality / Haze',
      icon: '🌫️',
      count: hasAirQualityData
        ? `AQI ${Math.round(airQuality.usAqi)}`
        : '--',
      group: 'Local Conditions',
    },
    {
      key: 'shelters',
      label: 'Nearby Shelters',
      icon: '🏠',
      count: shelters.length,
      group: 'Nearby Facilities',
    },
    {
      key: 'hospitals',
      label: 'Nearby Hospitals',
      icon: '🏥',
      count: hospitals.length,
      group: 'Nearby Facilities',
    },
  ];

  const hazardFilterOptions =
    filterOptions.filter(
      (option) =>
        option.key !== 'shelters' &&
        option.key !== 'hospitals'
    );

  const activeHazardFilterOptions =
    hazardFilterOptions.filter(
      (option) =>
        mapFilters[option.key]
    );

  const visibleHazardFilterOptions =
    activeHazardFilterOptions;

  const getNearestCardForFilter = (filter: MapFilter) => {
    const option =
      hazardFilterOptions.find(
        (item) => item.key === filter
      );

    const palette =
      getHazardFilterPalette(filter);

    const hazardDetails =
      getHazardsForFilter(filter);

    const nearestHazard =
      hazardDetails[0] ?? null;

    if (filter === 'earthquakes') {
      return {
        key: filter,
        label:
          option?.label ??
          getHazardFilterPluralLabel(filter),
        icon: option?.icon ?? '〰️',
        count: hazardDetails.length,
        palette,
        source: 'USGS',
        available: hazardDetails.length > 0,
        title: nearestHazard?.title ?? '',
        distanceText:
          nearestHazard?.distanceText ?? '',
        hazardDetail: nearestHazard,
        hazardDetails,
      };
    }

    if (filter === 'floods') {
      return {
        key: filter,
        label:
          option?.label ??
          getHazardFilterPluralLabel(filter),
        icon:
          option?.icon ??
          '🌊',
        count:
          hazardDetails.length,
        palette,
        source:
          nearestHazard?.source ??
          'GDACS + NASA EONET',
        available:
          hazardDetails.length > 0,
        title:
          nearestHazard?.title ?? '',
        distanceText:
          nearestHazard?.distanceText ?? '',
        hazardDetail:
          nearestHazard,
        hazardDetails,
      };
    }

    if (filter === 'weatherRisk') {
      return {
        key: filter,
        label:
          option?.label ??
          getHazardFilterPluralLabel(filter),
        icon: option?.icon ?? '🌦️',
        count: option?.count ?? riskLevel,
        palette,
        source: 'Open-Meteo • app-derived',
        available: hazardDetails.length > 0,
        title: nearestHazard?.title ?? '',
        distanceText:
          nearestHazard?.distanceText ?? '',
        hazardDetail: nearestHazard,
        hazardDetails,
      };
    }

    if (filter === 'airQuality') {
      return {
        key: filter,
        label: option?.label ?? 'Air Quality / Haze',
        icon: '🌫️',
        count: hasAirQualityData
          ? `AQI ${Math.round(airQuality.usAqi)}`
          : '--',
        palette,
        source: 'Open-Meteo / CAMS',
        available: hazardDetails.length > 0,
        title: nearestHazard?.title ?? '',
        distanceText: hasAirQualityData
          ? `PM2.5 ${airQuality.pm25.toFixed(1)} µg/m³ • PM10 ${airQuality.pm10.toFixed(1)} µg/m³`
          : '',
        hazardDetail: nearestHazard,
        hazardDetails,
      };
    }

    return {
      key: filter,
      label:
        option?.label ??
        getHazardFilterPluralLabel(filter),
      icon:
        option?.icon ??
        nearestHazard?.icon ??
        '⚠️',
      count: hazardDetails.length,
      palette,
      source:
        nearestHazard?.source ??
        'NASA EONET',
      available: hazardDetails.length > 0,
      title:
        hazardDetails.length > 0
          ? nearestHazard?.source?.includes(
              'Open-Meteo'
            )
            ? nearestHazard?.title ?? ''
            : getNaturalEventSummaryTitle(
                nearestHazard?.category ?? 'Natural Event'
              )
          : '',
      distanceText:
        nearestHazard?.distanceText ?? '',
      hazardDetail: nearestHazard,
      hazardDetails,
    };
  };

  const displayedNearestHazards =
    visibleHazardFilterOptions.map(
      (option) =>
        getNearestCardForFilter(
          option.key
        )
    );

  // Keep the nearest shelter/hospital cards outside the Selected filters
  // carousel. Only show an additional facility summary card in Selected
  // filters when MORE THAN ONE verified result exists for that enabled filter.
  const selectedFacilityFilterCards = [
    ...(mapFilters.shelters &&
    nearbyShelterResults.length > 1
      ? [
          {
            key: 'shelters' as const,
            icon: '🏠',
            label: 'Nearby shelters',
            count:
              nearbyShelterResults.length,
            title: `${
              nearbyShelterResults.length
            } verified shelters nearby`,
            subtext: `${
              nearbyShelterResults.length - 1
            } more beyond the nearest`,
            accent: '#059669',
          },
        ]
      : []),
    ...(mapFilters.hospitals &&
    nearbyHospitalResults.length > 1
      ? [
          {
            key: 'hospitals' as const,
            icon: '🏥',
            label: 'Nearby hospitals',
            count:
              nearbyHospitalResults.length,
            title: `${
              nearbyHospitalResults.length
            } verified hospitals nearby`,
            subtext: `${
              nearbyHospitalResults.length - 1
            } more beyond the nearest`,
            accent: '#2563EB',
          },
        ]
      : []),
  ];

  const selectedFilterCardCount =
    displayedNearestHazards.length +
    selectedFacilityFilterCards.length;

  const selectedFilterBadgeCount =
    activeHazardFilterOptions.length +
    (mapFilters.shelters ? 1 : 0) +
    (mapFilters.hospitals ? 1 : 0);

  const nearestHazardSectionTitle =
    visibleHazardFilterOptions.length === 0
      ? 'Nearest monitored hazards & conditions'
      : visibleHazardFilterOptions.length === 1
        ? `Nearest ${visibleHazardFilterOptions[0].label}`
        : visibleHazardFilterOptions.length === 2
          ? `Nearest ${visibleHazardFilterOptions[0].label} & ${visibleHazardFilterOptions[1].label}`
          : 'Nearest selected hazards & conditions';

  // ---------------------------------------------------------
  // SYNCHRONISED EVENT MARKERS
  // ---------------------------------------------------------
  // The marker layer is generated from the SAME getHazardsForFilter()
  // collections used by the cards below. This means that if an event appears
  // in a "Flood Events nearby", earthquake, wildfire, etc. card, the exact
  // same event also has a map marker.
  const EVENT_MAP_FILTERS: MapFilter[] = [
    'wildfires',
    'severeStorms',
    'volcanoes',
    'floods',
    'earthquakes',
    'landslides',
    'dustHazeEvents',
    'drought',
    'ice',
    'otherNatural',
  ];

  const visibleMapEventHazards = (() => {
    const seen = new Set<string>();

    const activeEventFilters =
      EVENT_MAP_FILTERS.filter(
        (filter) =>
          mapFilters[filter] ||
          (mapFilters.weatherRisk &&
            ((filter === 'floods' &&
              isElevatedRisk(
                weatherHazardRisks.rainFloodRisk
              )) ||
              (filter === 'severeStorms' &&
                isElevatedRisk(
                  weatherHazardRisks.windRisk
                )) ||
              (filter === 'otherNatural' &&
                isElevatedRisk(
                  weatherHazardRisks.temperatureRisk
                )))) ||
          (mapFilters.airQuality &&
            filter === 'dustHazeEvents' &&
            hasAirQualityData &&
            airQuality.usAqi >= 101)
      );

    return activeEventFilters
      .flatMap((filter) => getHazardsForFilter(filter))
      .filter((hazard) => {
        if (seen.has(hazard.id)) {
          return false;
        }

        seen.add(hazard.id);
        return true;
      });
  })();

  function getMapHazardMarkerColor(
    hazard: SelectedHazardDetail
  ) {
    if (selectedHazard?.id === hazard.id) {
      return '#EC4899';
    }

    if (
      hazard.source.includes(
        'Open-Meteo'
      )
    ) {
      return '#DC2626';
    }

    switch (hazard.filterKey as MapFilter) {
      case 'wildfires':
        return '#F97316';
      case 'severeStorms':
        return '#2563EB';
      case 'volcanoes':
        return '#7C3AED';
      case 'floods':
        return '#0284C7';
      case 'earthquakes':
        return '#7C3AED';
      case 'landslides':
        return '#92400E';
      case 'dustHazeEvents':
        return '#A16207';
      case 'drought':
        return '#CA8A04';
      case 'ice':
        return '#38BDF8';
      default:
        return '#6B7280';
    }
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.cleanScreen}>
        {/* ------------------------------------------------ */}
        {/* HEADER                                           */}
        {/* ------------------------------------------------ */}
        <View style={styles.cleanHeaderRow}>
          <View>
            <Text style={styles.cleanHeaderTitle}>
              Emergency map
            </Text>
            <Text style={styles.cleanHeaderSubtitle}>
              Live hazards and emergency resources nearby
            </Text>
          </View>

          <View style={styles.cleanLivePill}>
            <View style={styles.cleanLiveDot} />
            <Text style={styles.cleanLiveText}>
              Live
            </Text>
          </View>
        </View>

        {/* ------------------------------------------------ */}
        {/* SEARCH / FILTER CONTROLS                         */}
        {/* ------------------------------------------------ */}
        <View style={styles.cleanControlRow}>
          <View style={styles.cleanSearchColumn}>
            <View style={styles.cleanSearchAreaBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#64748B"
              />

              <TextInput
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowSearchSuggestions(true);
                  }
                }}
                onSubmitEditing={searchMapArea}
                returnKeyType="search"
                placeholder="Search city or area"
                placeholderTextColor="#94A3B8"
                autoCorrect={false}
                style={styles.cleanSearchInput}
                accessibilityLabel="Search city, neighbourhood, landmark or address"
              />

              {searchLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#10B981"
                />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={clearAreaSearch}
                  hitSlop={8}
                  accessibilityLabel="Clear area search"
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              ) : null}

              <Pressable
                style={styles.cleanSearchSubmitButton}
                onPress={searchMapArea}
                disabled={searchLoading}
                accessibilityRole="button"
                accessibilityLabel="Search map area"
              >
                <Text style={styles.cleanSearchSubmitText}>
                  Go
                </Text>
              </Pressable>
            </View>

            {showSearchSuggestions &&
              searchQuery.trim().length >= 2 && (
                <View style={styles.searchSuggestionsDropdown}>
                  {searchSuggestionsLoading &&
                  searchSuggestions.length === 0 ? (
                    <View style={styles.searchSuggestionLoadingRow}>
                      <ActivityIndicator
                        size="small"
                        color="#10B981"
                      />
                      <Text style={styles.searchSuggestionLoadingText}>
                        Searching places...
                      </Text>
                    </View>
                  ) : searchSuggestions.length > 0 ? (
                    searchSuggestions.map((suggestion, index) => (
                      <Pressable
                        key={suggestion.placeId}
                        style={({ pressed }) => [
                          styles.searchSuggestionRow,
                          index <
                            searchSuggestions.length - 1 &&
                            styles.searchSuggestionRowBorder,
                          pressed &&
                            styles.searchSuggestionRowPressed,
                        ]}
                        onPress={() =>
                          selectSearchSuggestion(
                            suggestion
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Search result ${suggestion.description}`}
                      >
                        <View style={styles.searchSuggestionIconBox}>
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color="#0A7A46"
                          />
                        </View>

                        <View style={styles.searchSuggestionTextWrap}>
                          <Text
                            style={styles.searchSuggestionMainText}
                            numberOfLines={1}
                          >
                            {suggestion.mainText}
                          </Text>

                          {!!suggestion.secondaryText && (
                            <Text
                              style={styles.searchSuggestionSecondaryText}
                              numberOfLines={1}
                            >
                              {suggestion.secondaryText}
                            </Text>
                          )}
                        </View>

                        <Ionicons
                          name="arrow-up-outline"
                          size={14}
                          color="#94A3B8"
                          style={{
                            transform: [
                              { rotate: '-45deg' },
                            ],
                          }}
                        />
                      </Pressable>
                    ))
                  ) : !searchSuggestionsLoading ? (
                    <View style={styles.searchSuggestionEmptyRow}>
                      <Ionicons
                        name="search-outline"
                        size={15}
                        color="#94A3B8"
                      />
                      <Text style={styles.searchSuggestionEmptyText}>
                        No matching places found
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cleanFilterButton,
              pressed && styles.cleanFilterButtonPressed,
            ]}
            hitSlop={10}
            onPressIn={openFilterSheet}
            accessibilityRole="button"
            accessibilityLabel="Open hazard filters"
          >
            <Ionicons
              name="options-outline"
              size={18}
              color="#111827"
            />

            <Text style={styles.cleanFilterButtonText}>
              Filters
            </Text>

            {selectedFilterBadgeCount > 0 && (
              <View
                pointerEvents="none"
                style={styles.cleanFilterBadge}
              >
                <Text style={styles.cleanFilterBadgeText}>
                  {selectedFilterBadgeCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ------------------------------------------------ */}
        {/* MAP                                              */}
        {/* ------------------------------------------------ */}
        <View style={styles.cleanMapCard}>
          <MapView
            ref={mapRef}
            style={styles.cleanMap}
            mapType="standard"
            showsBuildings
            showsPointsOfInterests
            showsCompass={false}
            showsScale={false}
            loadingEnabled
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {/* USER LOCATION */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={activeAreaLabel}
              description={
                activeAreaLabel === 'Current location'
                  ? 'Current GPS location'
                  : 'Selected map search area'
              }
              pinColor="#2563EB"
            />

            {/* VERIFIED / MAPPED SHELTERS */}
            {mapFilters.shelters &&
              shelters.map((shelter, index) => {
                const latitude =
                  shelter?.geometry?.location?.lat;
                const longitude =
                  shelter?.geometry?.location?.lng;

                if (
                  typeof latitude !== 'number' ||
                  typeof longitude !== 'number'
                ) {
                  return null;
                }

                return (
                  <Marker
                    key={`shelter-${index}`}
                    coordinate={{ latitude, longitude }}
                    title={shelter.name}
                    description={`Mapped emergency / evacuation shelter • ${
                      shelter.vicinity ?? 'Location available'
                    }`}
                    pinColor="#16A34A"
                  />
                );
              })}

            {/* HOSPITALS */}
            {mapFilters.hospitals &&
              hospitals.map((hospital, index) => {
                const latitude =
                  hospital?.geometry?.location?.lat;
                const longitude =
                  hospital?.geometry?.location?.lng;

                if (
                  typeof latitude !== 'number' ||
                  typeof longitude !== 'number'
                ) {
                  return null;
                }

                return (
                  <Marker
                    key={`hospital-${index}`}
                    coordinate={{ latitude, longitude }}
                    title={hospital.name}
                    description={
                      hospital.vicinity ?? 'Nearby hospital'
                    }
                    pinColor="#2563EB"
                  />
                );
              })}

            {/* SYNCHRONISED HAZARD EVENT MARKERS + CONTEXT CIRCLES */}
            {visibleMapEventHazards.map((hazard) => {
              const isSelected =
                selectedHazard?.id === hazard.id;

              return (
                <Fragment key={`map-hazard-${hazard.id}`}>
                  <Circle
                    center={{
                      latitude: hazard.latitude,
                      longitude: hazard.longitude,
                    }}
                    radius={HAZARD_CONTEXT_ZONE_RADIUS_M}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeColor={
                      isSelected
                        ? 'rgba(220,38,38,0.95)'
                        : 'rgba(220,38,38,0.70)'
                    }
                    fillColor={
                      isSelected
                        ? 'rgba(239,68,68,0.18)'
                        : 'rgba(239,68,68,0.10)'
                    }
                    zIndex={1}
                  />

                  <Marker
                    coordinate={{
                      latitude: hazard.latitude,
                      longitude: hazard.longitude,
                    }}
                    title={hazard.title}
                    description={`${hazard.source} • ${hazard.distanceText} • Red circle = Alerta Ready context area`}
                    onPress={() => {
                      focusSelectedHazard(
                        hazard,
                        getHazardsForFilter(
                          hazard.filterKey as MapFilter
                        )
                      );
                    }}
                    pinColor={getMapHazardMarkerColor(hazard)}
                    zIndex={2}
                  />
                </Fragment>
              );
            })}

            {/* Keep a selected hazard visible even if its normal layer is off. */}
            {selectedHazard &&
              selectedHazard.filterKey in mapFilters &&
              !mapFilters[
                selectedHazard.filterKey as MapFilter
              ] && (
                <Fragment
                  key={`selected-hidden-layer-${selectedHazard.id}`}
                >
                  <Circle
                    center={{
                      latitude: selectedHazard.latitude,
                      longitude: selectedHazard.longitude,
                    }}
                    radius={HAZARD_CONTEXT_ZONE_RADIUS_M}
                    strokeWidth={2.5}
                    strokeColor="rgba(220,38,38,0.95)"
                    fillColor="rgba(239,68,68,0.18)"
                    zIndex={1}
                  />

                  <Marker
                    coordinate={{
                      latitude: selectedHazard.latitude,
                      longitude: selectedHazard.longitude,
                    }}
                    title={selectedHazard.title}
                    description={`${selectedHazard.source} • ${selectedHazard.distanceText}`}
                    pinColor="#EC4899"
                    zIndex={2}
                  />
                </Fragment>
              )}
          </MapView>

          {/* Map status chip */}
          <View
            style={[
              styles.cleanHazardDistancePill,
              !selectedHazard &&
                !activeHazard &&
                styles.cleanHazardDistancePillSafe,
            ]}
          >
            <Text style={styles.cleanHazardDistanceText}>
              {selectedHazard
                ? `${selectedHazard.icon} Viewing ${selectedHazard.category} • ${selectedHazard.distanceText}`
                : activeHazard?.hazardDetail
                  ? `${activeHazard.hazardDetail.icon} ${
                      activeHazard.hazardDetail.category
                    } • ${activeHazard.hazardDetail.distanceText}`
                  : activeHazard
                    ? `⚠️ ${activeHazard.type} nearby`
                    : '✓ No immediate hazard nearby'}
            </Text>
          </View>

          {/* Coordinates - follow the place currently being viewed */}
          <View style={styles.cleanCoordinatesPill}>
            <Ionicons
              name="location"
              size={11}
              color="#EF4444"
            />
            <Text
              style={styles.cleanCoordinatesText}
              numberOfLines={1}
            >
              {(selectedHazard?.latitude ?? location.latitude).toFixed(4)}, {(selectedHazard?.longitude ?? location.longitude).toFixed(4)}
            </Text>
          </View>

          {/* Recenter */}
          <Pressable
            style={({ pressed }) => [
              styles.cleanRecenterButton,
              pressed &&
                styles.cleanRecenterButtonPressed,
              recenterLoading &&
                styles.cleanRecenterButtonLoading,
            ]}
            onPress={recenterToCurrentLocation}
            disabled={recenterLoading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Return to my current GPS location"
            accessibilityState={{
              disabled: recenterLoading,
              busy: recenterLoading,
            }}
          >
            {recenterLoading ? (
              <ActivityIndicator
                size="small"
                color="#111827"
              />
            ) : (
              <Ionicons
                name="locate-outline"
                size={21}
                color="#111827"
              />
            )}
          </Pressable>

          {/* Selected hazard detail */}
          {selectedHazard && (
            <View style={styles.cleanSelectedHazardCard}>
              <View style={styles.cleanSelectedHazardTopRow}>
                <View style={styles.cleanSelectedHazardIconBox}>
                  <Text style={styles.cleanSelectedHazardIcon}>
                    {selectedHazard.icon}
                  </Text>
                </View>

                <View style={styles.cleanSelectedHazardTitleWrap}>
                  <View style={styles.cleanSelectedHazardMetaRow}>
                    <Text style={styles.cleanSelectedHazardCategory}>
                      {selectedHazard.category.toUpperCase()}
                    </Text>

                    {selectedHazardCollection.length > 1 && (
                      <Text style={styles.cleanSelectedHazardCounter}>
                        {selectedHazardIndex + 1}/
                        {selectedHazardCollection.length}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={styles.cleanSelectedHazardTitle}
                    numberOfLines={2}
                  >
                    {selectedHazard.title}
                  </Text>
                </View>

                <Pressable
                  style={styles.cleanSelectedHazardClose}
                  onPress={closeSelectedHazard}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="#475569"
                  />
                </Pressable>
              </View>

              <Text style={styles.cleanSelectedHazardSource}>
                Source: {selectedHazard.source}
              </Text>

              <Text style={styles.cleanSelectedHazardZoneNote}>
                Map context radius: 25 km around this hazard location
              </Text>

              <Text style={styles.cleanSelectedHazardWeatherContext}>
                {selectedHazardWeatherLoading
                  ? 'Current weather: checking Open-Meteo…'
                  : `${
                      selectedHazard.source.includes('Open-Meteo')
                        ? 'Current local weather risk'
                        : 'Weather near this event'
                    }: ${
                      selectedHazardWeather?.riskLevel ??
                      'Unavailable'
                    }`}
              </Text>

              {selectedHazard.detailLines
                .slice(0, 2)
                .map((line, index) => (
                  <Text
                    key={`${selectedHazard.id}-clean-detail-${index}`}
                    style={styles.cleanSelectedHazardDetail}
                    numberOfLines={1}
                  >
                    {line}
                  </Text>
                ))}

              <View style={styles.cleanSelectedHazardBottomRow}>
                <Text
                  style={styles.cleanSelectedHazardCoordinates}
                  numberOfLines={1}
                >
                  📍 {selectedHazard.latitude.toFixed(4)}, {selectedHazard.longitude.toFixed(4)}
                </Text>

                <Text style={styles.cleanSelectedHazardDistance}>
                  {selectedHazard.distanceText}
                </Text>
              </View>

              {selectedHazardCollection.length > 1 && (
                <View style={styles.cleanBrowseRow}>
                  <Pressable
                    style={styles.cleanBrowseButton}
                    onPress={showPreviousSelectedHazard}
                  >
                    <Text style={styles.cleanBrowseButtonText}>
                      ‹ Previous
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.cleanViewAllButton}
                    onPress={() => setHazardListModalVisible(true)}
                  >
                    <Text style={styles.cleanViewAllButtonText}>
                      View all {selectedHazardCollection.length}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.cleanBrowseButton}
                    onPress={showNextSelectedHazard}
                  >
                    <Text style={styles.cleanBrowseButtonText}>
                      Next ›
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ------------------------------------------------ */}
        {/* INFORMATION PANEL                                */}
        {/* ------------------------------------------------ */}
        <ScrollView
          style={styles.cleanInfoScroll}
          contentContainerStyle={styles.cleanInfoContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedHazard ? (
            <View style={styles.cleanWeatherContextCard}>
              <View style={styles.cleanWeatherContextIconWrap}>
                <Ionicons
                  name="partly-sunny-outline"
                  size={19}
                  color="#0369A1"
                />
              </View>

              <View style={styles.cleanAlertTextWrap}>
                <Text style={styles.cleanWeatherContextEyebrow}>
                  WEATHER NEAR SELECTED HAZARD
                </Text>

                <Text
                  style={styles.cleanWeatherContextTitle}
                  numberOfLines={1}
                >
                  {selectedHazardWeatherLoading
                    ? 'Checking current conditions…'
                    : `${
                        selectedHazardWeather?.riskLevel ??
                        'Unavailable'
                      }`}
                </Text>

                <Text
                  style={styles.cleanWeatherContextDetail}
                  numberOfLines={2}
                >
                  {selectedHazardWeatherLoading
                    ? `Loading Open-Meteo context for ${selectedHazard.title}.`
                    : selectedHazardWeather?.details ??
                      'Current weather context is unavailable for this event location.'}
                </Text>

                <Text style={styles.cleanWeatherContextSource}>
                  Open-Meteo • event location • contextual information only
                </Text>
              </View>
            </View>
          ) : activeHazard ? (
            <View style={styles.cleanAlertCard}>
              <View style={styles.cleanAlertIconWrap}>
                <Ionicons
                  name="warning-outline"
                  size={19}
                  color="#B91C1C"
                />
              </View>

              <View style={styles.cleanAlertTextWrap}>
                <Text style={styles.cleanAlertEyebrow}>
                  {activeHazard.type}
                </Text>

                <Text
                  style={styles.cleanAlertTitle}
                  numberOfLines={1}
                >
                  {activeHazard.title}
                </Text>

                <Text
                  style={styles.cleanAlertDetail}
                  numberOfLines={1}
                >
                  {activeHazard.detail}
                </Text>

                <Text style={styles.cleanAlertSource}>
                  {activeHazard.source} • Alerta Ready relevance rule
                </Text>
              </View>

              {activeHazard.hazardDetail && (
                <Pressable
                  style={styles.cleanAlertViewButton}
                  onPress={() => {
                    const detail = activeHazard.hazardDetail;

                    if (!detail) {
                      return;
                    }

                    const browseCollection =
                      getHazardsForFilter(
                        detail.filterKey as MapFilter
                      );

                    focusSelectedHazard(
                      detail,
                      browseCollection.length > 0
                        ? browseCollection
                        : [detail]
                    );
                  }}
                >
                  <Text style={styles.cleanAlertViewText}>
                    View
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.cleanSafeCard}>
              <View style={styles.cleanSafeIconWrap}>
                <Ionicons
                  name="checkmark"
                  size={17}
                  color="#15803D"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cleanSafeTitle}>
                  No immediate map hazard nearby
                </Text>
                <Text style={styles.cleanSafeSubtext}>
                  No active Alerta Ready relevance rule is currently triggered.
                </Text>
              </View>
            </View>
          )}

          {/* Swipeable map legend */}
          <View style={styles.cleanLegendCard}>
            <Text style={styles.cleanLegendTitle}>
              Map Legend
            </Text>

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cleanLegendScrollContent}
            >
              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#2563EB' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Your Location
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#16A34A' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Shelter
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#2563EB' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Hospital
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View style={styles.cleanLegendZoneSymbol} />
                <Text style={styles.cleanLegendItemText}>
                  Context Zone
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#F97316' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Wildfire
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#2563EB' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Storm
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#0284C7' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Flood
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#7C3AED' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Earthquake
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#7C3AED' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Volcano
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#92400E' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Landslide
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#A16207' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Dust / Haze
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#CA8A04' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Drought
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#38BDF8' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Ice
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#DC2626' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Weather Risk
                </Text>
              </View>

              <View style={styles.cleanLegendItem}>
                <View
                  style={[
                    styles.cleanLegendMarkerDot,
                    { backgroundColor: '#EC4899' },
                  ]}
                />
                <Text style={styles.cleanLegendItemText}>
                  Selected Hazard
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* Nearby emergency facilities */}
          <View style={styles.cleanFacilityRow}>
            <View
              style={[
                styles.cleanFacilityCard,
                {
                  width: UNIFIED_CARD_WIDTH,
                  height: UNIFIED_CARD_HEIGHT,
                },
              ]}
            >
              <View style={styles.cleanFacilityTitleRow}>
                <View style={styles.cleanFacilityShelterIcon}>
                  <Ionicons
                    name="home-outline"
                    size={16}
                    color="#0F766E"
                  />
                </View>

                <Text style={styles.cleanFacilityLabel}>
                  Nearest shelter
                </Text>
              </View>

              <Text
                style={styles.cleanFacilityValue}
                numberOfLines={2}
              >
                {nearestShelter
                  ? nearestShelter.name
                  : 'Not mapped'}
              </Text>

              <Text style={styles.cleanFacilityMeta}>
                {nearestShelter
                  ? `${formatDistance(
                      nearestShelter.distanceKm
                    )} away`
                  : 'No verified shelter found nearby'}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.cleanFacilityButton,
                  nearestShelter
                    ? styles.cleanFacilityButtonShelter
                    : styles.cleanFacilityButtonSecondary,
                  pressed && styles.cleanFacilityButtonPressed,
                ]}
                onPress={() =>
                  nearestShelter
                    ? handleDirections(
                        nearestShelter,
                        'shelter'
                      )
                    : searchEmergencyLocationInMaps(
                        'shelter'
                      )
                }
                accessibilityRole="button"
                accessibilityLabel={
                  nearestShelter
                    ? `Get directions to ${nearestShelter.name}`
                    : 'Search Google Maps for emergency shelters'
                }
              >
                <Ionicons
                  name={
                    nearestShelter
                      ? 'navigate-outline'
                      : 'search-outline'
                  }
                  size={14}
                  color={
                    nearestShelter
                      ? '#FFFFFF'
                      : '#0F766E'
                  }
                />

                <Text
                  style={[
                    styles.cleanFacilityButtonText,
                    !nearestShelter &&
                      styles.cleanFacilityButtonTextSecondary,
                  ]}
                >
                  {nearestShelter
                    ? 'Directions'
                    : 'Search Maps'}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.cleanFacilityCard,
                {
                  width: UNIFIED_CARD_WIDTH,
                  height: UNIFIED_CARD_HEIGHT,
                },
              ]}
            >
              <View style={styles.cleanFacilityTitleRow}>
                <View style={styles.cleanFacilityHospitalIcon}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color="#2563EB"
                  />
                </View>

                <Text style={styles.cleanFacilityLabel}>
                  Nearest hospital
                </Text>
              </View>

              <Text
                style={styles.cleanFacilityValue}
                numberOfLines={2}
              >
                {nearestHospital
                  ? nearestHospital.name
                  : 'Not mapped'}
              </Text>

              <Text style={styles.cleanFacilityMeta}>
                {nearestHospital
                  ? `${formatDistance(
                      nearestHospital.distanceKm
                    )} away`
                  : 'No verified hospital found nearby'}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.cleanFacilityButton,
                  nearestHospital
                    ? styles.cleanFacilityButtonHospital
                    : styles.cleanFacilityButtonSecondary,
                  pressed && styles.cleanFacilityButtonPressed,
                ]}
                onPress={() =>
                  nearestHospital
                    ? handleDirections(
                        nearestHospital,
                        'hospital'
                      )
                    : searchEmergencyLocationInMaps(
                        'hospital'
                      )
                }
                accessibilityRole="button"
                accessibilityLabel={
                  nearestHospital
                    ? `Get directions to ${nearestHospital.name}`
                    : 'Search Google Maps for nearby hospitals'
                }
              >
                <Ionicons
                  name={
                    nearestHospital
                      ? 'navigate-outline'
                      : 'search-outline'
                  }
                  size={14}
                  color={
                    nearestHospital
                      ? '#FFFFFF'
                      : '#2563EB'
                  }
                />

                <Text
                  style={[
                    styles.cleanFacilityButtonText,
                    !nearestHospital &&
                      styles.cleanFacilityButtonTextHospitalSecondary,
                  ]}
                >
                  {nearestHospital
                    ? 'Directions'
                    : 'Search Maps'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Selected filters - hazards/conditions plus extra facilities */}
          <View style={styles.cleanHazardCarouselSection}>
            <View style={styles.cleanHazardCarouselHeader}>
              <Text style={styles.cleanHazardCarouselTitle}>
                Selected filters
              </Text>

              {selectedFilterCardCount > 1 && (
                <View style={styles.cleanSwipeHint}>
                  <Text style={styles.cleanSwipeHintText}>
                    Swipe
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={12}
                    color="#94A3B8"
                  />
                </View>
              )}
            </View>

            {selectedFilterCardCount === 0 ? (
              <Pressable
                style={styles.cleanStatusEmptyCard}
                onPress={openFilterSheet}
              >
                <View style={styles.cleanStatusIconNeutral}>
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color="#000000"
                  />
                </View>

                <View style={styles.cleanStatusTextWrap}>
                  <Text style={styles.cleanStatusTitle}>
                    Choose filters
                  </Text>
                  <Text style={styles.cleanStatusSubtext}>
                    Select hazards, conditions, shelters or hospitals
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color="#000000"
                />
              </Pressable>
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={
                  UNIFIED_CARD_WIDTH +
                  UNIFIED_CARD_GAP
                }
                snapToAlignment="start"
                contentContainerStyle={
                  styles.cleanStatusHorizontalContent
                }
              >
                {selectedFacilityFilterCards.map((facility) => (
                  <Pressable
                    key={`facility-filter-${facility.key}`}
                    style={({ pressed }) => [
                      styles.cleanStatusCard,
                      {
                        width: UNIFIED_CARD_WIDTH,
                        height: SELECTED_FILTER_CARD_HEIGHT,
                      },
                      styles.cleanStatusCardAvailable,
                      pressed &&
                        styles.cleanStatusCardPressed,
                    ]}
                    onPress={() =>
                      openFacilityList(
                        facility.key === 'shelters'
                          ? 'shelter'
                          : 'hospital'
                      )
                    }
                  >
                    <View style={styles.cleanStatusCardTopRow}>
                      <View
                        style={[
                          styles.cleanStatusIconBox,
                          {
                            backgroundColor:
                              facility.key === 'shelters'
                                ? '#ECFDF5'
                                : '#EFF6FF',
                          },
                        ]}
                      >
                        <Text style={styles.cleanStatusEmoji}>
                          {facility.icon}
                        </Text>
                      </View>

                      <View style={styles.cleanStatusViewPill}>
                        <Text style={styles.cleanStatusViewPillText}>
                          View all
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={12}
                          color="#475569"
                        />
                      </View>
                    </View>

                    <Text
                      style={styles.cleanStatusCardTitle}
                      numberOfLines={2}
                    >
                      {facility.title}
                    </Text>

                    <Text
                      style={styles.cleanStatusCardSubtext}
                      numberOfLines={2}
                    >
                      {facility.subtext}
                    </Text>

                    <View
                      style={[
                        styles.cleanStatusCardAccent,
                        {
                          backgroundColor:
                            facility.accent,
                        },
                      ]}
                    />
                  </Pressable>
                ))}

                {displayedNearestHazards.map((item) => (
                  <Pressable
                    key={`clean-status-${item.key}`}
                    style={({ pressed }) => [
                      styles.cleanStatusCard,
                      {
                        width: UNIFIED_CARD_WIDTH,
                        height: SELECTED_FILTER_CARD_HEIGHT,
                      },
                      item.available &&
                        styles.cleanStatusCardAvailable,
                      pressed &&
                        item.available &&
                        styles.cleanStatusCardPressed,
                    ]}
                    disabled={!item.available || !item.hazardDetail}
                    onPress={() => {
                      if (item.hazardDetail) {
                        focusSelectedHazard(
                          item.hazardDetail,
                          item.hazardDetails
                        );
                      }
                    }}
                  >
                    <View style={styles.cleanStatusCardTopRow}>
                      <View
                        style={[
                          styles.cleanStatusIconBox,
                          {
                            backgroundColor:
                              item.available
                                ? item.palette.background
                                : '#F8FAFC',
                          },
                        ]}
                      >
                        <Text style={styles.cleanStatusEmoji}>
                          {item.icon}
                        </Text>
                      </View>

                      {item.available && item.hazardDetail ? (
                        <View style={styles.cleanStatusViewPill}>
                          <Text style={styles.cleanStatusViewPillText}>
                            View
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={12}
                            color="#475569"
                          />
                        </View>
                      ) : (
                        <View style={styles.cleanClearPill}>
                          <Text style={styles.cleanClearPillText}>
                            Clear
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={styles.cleanStatusCardTitle}
                      numberOfLines={2}
                    >
                      {item.available
                        ? `${item.label} nearby`
                        : `No ${getHazardFilterEmptyLabel(
                            item.key
                          )} detected nearby`}
                    </Text>

                    <Text
                      style={styles.cleanStatusCardSubtext}
                      numberOfLines={2}
                    >
                      {item.available
                        ? `${item.title} • ${item.distanceText}`
                        : `Within ${MONITORED_HAZARD_RANGE_KM} km`}
                    </Text>

                    {item.available && (
                      <View
                        style={[
                          styles.cleanStatusCardAccent,
                          {
                            backgroundColor:
                              item.palette.text,
                          },
                        ]}
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.cleanDataSourceText}>
            NASA EONET • GDACS • USGS • Open-Meteo/CAMS • Google Places
          </Text>
        </ScrollView>
      </View>

      <Modal
        visible={facilityListModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setFacilityListModalVisible(false)
        }
      >
        <View style={styles.hazardListModalOverlay}>
          <View style={styles.hazardListSheet}>
            <View style={styles.hazardListHandle} />

            <View style={styles.hazardListHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hazardListTitle}>
                  {selectedFacilityType === 'shelter'
                    ? 'Nearby shelters'
                    : 'Nearby hospitals'}
                </Text>

                <Text style={styles.hazardListSubtitle}>
                  {selectedFacilityList.length} within {EMERGENCY_LOCATION_MAX_KM} km • nearest first
                </Text>
              </View>

              <Pressable
                style={styles.hazardListCloseButton}
                onPress={() =>
                  setFacilityListModalVisible(false)
                }
                accessibilityRole="button"
                accessibilityLabel="Close nearby facility list"
              >
                <Text style={styles.hazardListCloseText}>
                  ×
                </Text>
              </Pressable>
            </View>

            <FlatList
              data={selectedFacilityList}
              keyExtractor={(item, index) =>
                String(
                  item?.place_id ??
                    `${selectedFacilityType}-${index}`
                )
              }
              style={styles.hazardList}
              contentContainerStyle={styles.hazardListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isNearest = index === 0;

                return (
                  <View
                    style={[
                      styles.hazardListItem,
                      isNearest &&
                        styles.hazardListItemSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.hazardListItemIconBox,
                        {
                          backgroundColor:
                            selectedFacilityType === 'shelter'
                              ? '#ECFDF5'
                              : '#EFF6FF',
                        },
                      ]}
                    >
                      <Text style={styles.hazardListItemIcon}>
                        {selectedFacilityType === 'shelter'
                          ? '🏠'
                          : '🏥'}
                      </Text>
                    </View>

                    <View style={styles.hazardListItemTextWrap}>
                      <Text
                        style={styles.hazardListItemTitle}
                        numberOfLines={2}
                      >
                        {item?.name ??
                          (selectedFacilityType === 'shelter'
                            ? 'Emergency shelter'
                            : 'Hospital')}
                      </Text>

                      <Text
                        style={styles.hazardListItemDetail}
                        numberOfLines={1}
                      >
                        {formatDistance(
                          Number(item?.distanceKm ?? 0)
                        )} away
                        {isNearest ? ' • nearest' : ''}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.facilityListDirectionsButton}
                      onPress={() =>
                        handleDirections(
                          item,
                          selectedFacilityType === 'shelter'
                            ? 'shelter'
                            : 'hospital'
                        )
                      }
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={13}
                        color="#FFFFFF"
                      />
                      <Text style={styles.facilityListDirectionsText}>
                        Directions
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={hazardListModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setHazardListModalVisible(false)
        }
      >
        <View style={styles.hazardListModalOverlay}>
          <View style={styles.hazardListSheet}>
            <View style={styles.hazardListHandle} />

            <View style={styles.hazardListHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hazardListTitle}>
                  {selectedHazard
                    ? getHazardFilterPluralLabel(
                        selectedHazard.filterKey as MapFilter
                      )
                    : 'Nearby hazards'}
                </Text>
                <Text style={styles.hazardListSubtitle}>
                  {selectedHazardCollection.length} within {MONITORED_HAZARD_RANGE_KM} km • nearest first
                </Text>
              </View>

              <Pressable
                style={styles.hazardListCloseButton}
                onPress={() =>
                  setHazardListModalVisible(false)
                }
                accessibilityRole="button"
                accessibilityLabel="Close hazard list"
              >
                <Text style={styles.hazardListCloseText}>×</Text>
              </Pressable>
            </View>

            <FlatList
              data={selectedHazardCollection}
              keyExtractor={item => item.id}
              style={styles.hazardList}
              contentContainerStyle={styles.hazardListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isCurrent =
                  index === selectedHazardIndex;

                return (
                  <Pressable
                    style={[
                      styles.hazardListItem,
                      isCurrent &&
                        styles.hazardListItemSelected,
                    ]}
                    onPress={() => {
                      showSelectedHazardAtIndex(index);
                      setHazardListModalVisible(false);
                    }}
                  >
                    <View style={styles.hazardListItemIconBox}>
                      <Text style={styles.hazardListItemIcon}>
                        {item.icon}
                      </Text>
                    </View>

                    <View style={styles.hazardListItemTextWrap}>
                      <Text
                        style={styles.hazardListItemTitle}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={styles.hazardListItemDetail}
                        numberOfLines={1}
                      >
                        {item.detailLines[0] ?? item.source}
                      </Text>
                    </View>

                    <View style={styles.hazardListItemRight}>
                      <Text style={styles.hazardListItemDistance}>
                        {item.distanceText}
                      </Text>
                      <Text
                        style={[
                          styles.hazardListItemAction,
                          isCurrent &&
                            styles.hazardListItemActionSelected,
                        ]}
                      >
                        {isCurrent ? 'Viewing' : 'View'}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {filterModalVisible && (
        <View style={styles.filterInlineOverlay}>
          <Pressable
            style={styles.filterInlineBackdrop}
            onPress={() => setFilterModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close filter sheet"
          />

          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHandle} />

            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>
                Filters
              </Text>

              <View style={styles.filterHeaderActions}>
                <Pressable
                  onPress={resetPendingFilters}
                  hitSlop={10}
                >
                  <Text style={styles.filterResetText}>
                    Reset
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.filterCloseButton}
                  onPress={() =>
                    setFilterModalVisible(false)
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close filters"
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="#475569"
                  />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.filterSheetScroll}
              contentContainerStyle={styles.filterSheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filterOptions.map((option) => (
                <View
                  key={option.key}
                  style={styles.filterRow}
                >
                  <View style={styles.filterRowLeft}>
                    <Text style={styles.filterRowIcon}>
                      {option.icon}
                    </Text>

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
                        !pendingFilters[option.key] && {
                          backgroundColor: '#F3F4F6',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,
                          option.key === 'wildfires' &&
                            pendingFilters[option.key] &&
                            styles.filterCountTextWildfire,
                          option.key === 'severeStorms' &&
                            pendingFilters[option.key] &&
                            styles.filterCountTextStorm,
                          !pendingFilters[option.key] && {
                            color: '#9CA3AF',
                          },
                        ]}
                      >
                        {option.count}
                      </Text>
                    </View>
                  </View>

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
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={styles.filterApplyButton}
              onPress={applyPendingFilters}
            >
              <Text style={styles.filterApplyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}
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
      paddingLeft: 7,
      paddingRight: 5,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.97)',
      elevation: 5,
      overflow: 'hidden',
    },

    hazardChipScroll: {
      flex: 1,
      minWidth: 0,
    },

    hazardChipScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingRight: 8,
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

    dynamicHazardChip: {
      minHeight: 34,
      maxWidth: 132,
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: 18,
      borderWidth: 1,
    },

    dynamicHazardChipIcon: {
      fontSize: 10,
    },

    dynamicHazardChipText: {
      maxWidth: 64,
      fontSize: 9,
      fontWeight: '800',
    },

    dynamicHazardCountBadge: {
      minWidth: 19,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dynamicHazardCountText: {
      fontSize: 8,
      fontWeight: '900',
    },

    noHazardFiltersChip: {
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#F9FAFB',
      alignItems: 'center',
      justifyContent: 'center',
    },

    noHazardFiltersText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#6B7280',
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

    hazardListModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15,23,42,0.32)',
    },

    hazardListSheet: {
      maxHeight: '68%',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 18,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: '#FFFFFF',
    },

    hazardListHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#D1D5DB',
      marginBottom: 12,
    },

    hazardListHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },

    hazardListTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: '#111827',
    },

    hazardListSubtitle: {
      marginTop: 3,
      fontSize: 9,
      color: '#6B7280',
    },

    hazardListCloseButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },

    hazardListCloseText: {
      marginTop: -2,
      fontSize: 22,
      lineHeight: 24,
      color: '#374151',
    },

    hazardList: {
      flexGrow: 0,
    },

    hazardListContent: {
      paddingBottom: 8,
      gap: 8,
    },

    hazardListItem: {
      minHeight: 66,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    hazardListItemSelected: {
      borderColor: '#A5B4FC',
      backgroundColor: '#F5F7FF',
    },

    hazardListItemIconBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
    },

    hazardListItemIcon: {
      fontSize: 17,
    },

    hazardListItemTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    hazardListItemTitle: {
      fontSize: 10.5,
      fontWeight: '900',
      color: '#111827',
    },

    hazardListItemDetail: {
      marginTop: 3,
      fontSize: 8.5,
      color: '#64748B',
    },

    hazardListItemRight: {
      alignItems: 'flex-end',
      gap: 4,
    },

    hazardListItemDistance: {
      fontSize: 8.5,
      fontWeight: '800',
      color: '#334155',
    },

    hazardListItemAction: {
      fontSize: 8,
      fontWeight: '900',
      color: '#2563EB',
    },

    hazardListItemActionSelected: {
      color: '#16A34A',
    },

    facilityListDirectionsButton: {
      minHeight: 30,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: '#2563EB',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    facilityListDirectionsText: {
      fontSize: 7.5,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    filterInlineOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-end',
      zIndex: 9999,
      elevation: 9999,
    },

    filterInlineBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(17,24,39,0.38)',
    },

    filterSheet: {
      maxHeight: '86%',
      minHeight: 520,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 18,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: '#FFFFFF',
      position: 'relative',
      zIndex: 10000,
      elevation: 10000,
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
      marginBottom: 6,
    },

    filterSheetTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#111827',
    },

    filterHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    filterCloseButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F1F5F9',
    },

    filterSafetyNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: '#FFF7ED',
      borderWidth: 1,
      borderColor: '#FED7AA',
    },

    filterSafetyNoteIcon: {
      marginTop: 1,
      fontSize: 12,
    },

    filterSafetyNoteText: {
      flex: 1,
      fontSize: 9,
      lineHeight: 13,
      color: '#9A3412',
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
      paddingBottom: 8,
    },


    filterGroupHeader: {
      paddingTop: 10,
      paddingBottom: 6,
    },

    filterGroupTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#111827',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    filterGroupHint: {
      marginTop: 2,
      fontSize: 9,
      color: '#6B7280',
    },

    filterRow: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
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
      minHeight: 46,
      marginTop: 8,
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

    selectedHazardFloatingCard: {
      position: 'absolute',
      top: 118,
      left: 12,
      right: 12,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      elevation: 10,
      zIndex: 30,
      shadowColor: '#000000',
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 3,
      },
    },

    selectedHazardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },

    selectedHazardTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    selectedHazardIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },

    selectedHazardIcon: {
      fontSize: 17,
    },

    selectedHazardTitleWrap: {
      flex: 1,
      minWidth: 0,
    },

    selectedHazardCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    selectedHazardCounterPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: '#EEF2FF',
    },

    selectedHazardCounterText: {
      fontSize: 7.5,
      fontWeight: '900',
      color: '#4F46E5',
    },

    selectedHazardCategory: {
      fontSize: 8,
      fontWeight: '900',
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    selectedHazardTitle: {
      marginTop: 1,
      fontSize: 12.5,
      lineHeight: 16,
      fontWeight: '900',
      color: '#111827',
    },

    selectedHazardCloseButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },

    selectedHazardCloseText: {
      marginTop: -2,
      fontSize: 21,
      lineHeight: 23,
      fontWeight: '500',
      color: '#374151',
    },

    selectedHazardSource: {
      marginTop: 6,
      fontSize: 8,
      fontWeight: '800',
      color: '#6B7280',
    },

    selectedHazardDetail: {
      marginTop: 3,
      fontSize: 9.5,
      lineHeight: 13,
      color: '#374151',
    },

    selectedHazardLocationRow: {
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    selectedHazardCoordinates: {
      flex: 1,
      fontSize: 8,
      fontWeight: '700',
      color: '#6B7280',
    },

    selectedHazardDistance: {
      fontSize: 9,
      fontWeight: '900',
      color: '#111827',
    },

    selectedHazardBrowserRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 7,
    },

    selectedHazardBrowserButton: {
      flex: 1,
      minHeight: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    selectedHazardBrowserButtonText: {
      fontSize: 8.5,
      fontWeight: '900',
      color: '#334155',
    },

    selectedHazardViewAllButton: {
      flex: 1.08,
      minHeight: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
    },

    selectedHazardViewAllText: {
      fontSize: 8.5,
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

    filteredNearestTitle: {
      marginTop: 9,
      marginBottom: 7,
      fontSize: 12,
      fontWeight: '900',
      color: '#111827',
    },

    filteredHazardCardsScrollContent: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
      paddingRight: 8,
    },

    filteredHazardCard: {
      width: 148,
      minHeight: 88,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
    },

    filteredHazardCardPressable: {
      elevation: 1,
    },

    filteredHazardCardSelected: {
      borderWidth: 2,
      elevation: 4,
    },

    filteredHazardCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
    },

    filteredHazardCardSource: {
      fontSize: 7,
      fontWeight: '900',
    },

    filteredHazardCardIcon: {
      fontSize: 12,
    },

    filteredHazardCardTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#111827',
    },

    filteredHazardCardDistance: {
      marginTop: 3,
      fontSize: 9,
      fontWeight: '700',
    },

    filteredHazardCardTapHint: {
      marginTop: 5,
      fontSize: 8,
      fontWeight: '900',
      opacity: 0.75,
    },

    filteredHazardEmptyCard: {
      minHeight: 94,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      backgroundColor: '#FAFAFA',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    filteredHazardEmptyIcon: {
      fontSize: 22,
      color: '#9CA3AF',
      marginBottom: 6,
    },

    filteredHazardEmptyTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#374151',
      textAlign: 'center',
    },

    filteredHazardEmptySubtitle: {
      marginTop: 3,
      fontSize: 9,
      color: '#6B7280',
      textAlign: 'center',
    },

    filteredMiniEmptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 3,
    },

    filteredMiniEmptyIcon: {
      fontSize: 17,
      marginBottom: 4,
      opacity: 0.55,
    },

    filteredMiniEmptyTitle: {
      fontSize: 9,
      fontWeight: '800',
      color: '#6B7280',
      textAlign: 'center',
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

    activeWarningHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    persistentAlertPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#FECACA',
    },

    persistentAlertPillText: {
      fontSize: 8,
      fontWeight: '900',
      color: '#991B1B',
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

    activeWarningFooterRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 8,
    },

    activeWarningSourceWrap: {
      flex: 1,
      minWidth: 0,
    },

    activeWarningSource: {
      fontSize: 8,
      color: '#991B1B',
    },

    activeWarningPersistenceNote: {
      marginTop: 2,
      fontSize: 8,
      fontWeight: '700',
      color: '#B91C1C',
    },

    activeWarningViewButton: {
      minWidth: 54,
      minHeight: 30,
      paddingHorizontal: 12,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#B91C1C',
    },

    activeWarningViewButtonText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    activeWarningRuleText: {
      marginTop: 7,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: '#FECACA',
      fontSize: 7.5,
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

    recenterButton: {
      position: 'absolute',
      right: 16,
      top: 74,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      elevation: 5,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 5,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      zIndex: 20,
    },

    recenterButtonIcon: {
      fontSize: 24,
      fontWeight: '800',
      color: '#0A7A46',
    },


    mapLocationChip: {
      position: 'absolute',
      left: 16,
      top: 74,
      maxWidth: 190,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      elevation: 4,
      zIndex: 19,
    },

    mapLocationChipText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#374151',
    },


    // ------------------------------------------------------
    // CLEAN MAP REDESIGN
    // ------------------------------------------------------
    cleanScreen: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },

    cleanHeaderRow: {
      minHeight: 58,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },

    cleanHeaderTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#111827',
    },

    cleanHeaderSubtitle: {
      marginTop: 2,
      fontSize: 10,
      color: '#64748B',
    },

    cleanLivePill: {
      marginTop: 13,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: '#DCFCE7',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    cleanLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },

    cleanLiveText: {
      fontSize: 15,
      fontWeight: '900',
      color: '#15803D',
    },

    cleanControlRow: {
      paddingHorizontal: 12,
      paddingBottom: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFFFFF',
      position: 'relative',
      zIndex: 100,
      elevation: 12,
    },

    cleanSearchColumn: {
      flex: 1,
      position: 'relative',
      zIndex: 150,
      elevation: 20,
    },

    cleanSearchAreaBox: {
      width: '100%',
      height: 42,
      paddingLeft: 11,
      paddingRight: 5,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 6,
    },

    cleanSearchInput: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      paddingVertical: 0,
      fontSize: 11,
      fontWeight: '700',
      color: '#111827',
    },

    cleanSearchSubmitButton: {
      minWidth: 34,
      height: 30,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ECFDF5',
    },

    cleanSearchSubmitText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#047857',
    },

    searchSuggestionsDropdown: {
      position: 'absolute',
      top: 52,
      left: 0,
      right: 0,
      maxHeight: 250,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      zIndex: 999,
      elevation: 24,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    searchSuggestionRow: {
      minHeight: 54,
      paddingHorizontal: 11,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: '#FFFFFF',
    },

    searchSuggestionRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },

    searchSuggestionRowPressed: {
      backgroundColor: '#F8FAFC',
    },

    searchSuggestionIconBox: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ECFDF5',
      flexShrink: 0,
    },

    searchSuggestionTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    searchSuggestionMainText: {
      fontSize: 10.5,
      fontWeight: '900',
      color: '#111827',
    },

    searchSuggestionSecondaryText: {
      marginTop: 2,
      fontSize: 8,
      color: '#64748B',
    },

    searchSuggestionLoadingRow: {
      minHeight: 54,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    searchSuggestionLoadingText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#64748B',
    },

    searchSuggestionEmptyRow: {
      minHeight: 50,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    searchSuggestionEmptyText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#94A3B8',
    },

    cleanFilterButton: {
      minWidth: 82,
      height: 35,
      paddingHorizontal: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      position: 'relative',
      zIndex: 110,
      elevation: 14,
      marginTop: 6,
    },

    cleanFilterButtonPressed: {
      opacity: 0.65,
      backgroundColor: '#F8FAFC',
    },

    cleanFilterButtonText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#111827',
    },










    cleanFilterBadge: {
      position: 'absolute',
      right: -5,
      top: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },

    cleanFilterBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    cleanMapCard: {
      height: 315,
      marginHorizontal: 12,
      borderRadius: 15,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#F1F5F9',
      borderWidth: 1,
      borderColor: '#F1F5F9',
      zIndex: 1,
      elevation: 0,
    },

    cleanMap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    cleanHazardDistancePill: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      maxWidth: 230,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: '#FEE2E2',
      borderWidth: 1,
      borderColor: '#FECACA',
      elevation: 4,
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },

    cleanHazardDistancePillSafe: {
      backgroundColor: '#ECFDF5',
      borderColor: '#BBF7D0',
    },

    cleanHazardDistanceText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#374151',
    },

    cleanCoordinatesPill: {
      position: 'absolute',
      left: 10,
      top: 10,
      maxWidth: 180,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      elevation: 3,
    },

    cleanCoordinatesText: {
      fontSize: 8,
      fontWeight: '700',
      color: '#475569',
    },

    cleanRecenterButton: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      elevation: 5,
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },

    cleanRecenterButtonPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.96 }],
    },

    cleanRecenterButtonLoading: {
      backgroundColor: '#F8FAFC',
    },

    cleanSelectedHazardCard: {
      position: 'absolute',
      left: 10,
      right: 10,
      top: 10,
      padding: 11,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      elevation: 6,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 3 },
    },

    cleanSelectedHazardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    cleanSelectedHazardIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanSelectedHazardIcon: {
      fontSize: 17,
    },

    cleanSelectedHazardTitleWrap: {
      flex: 1,
      minWidth: 0,
    },

    cleanSelectedHazardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    cleanSelectedHazardCategory: {
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.5,
      color: '#64748B',
    },

    cleanSelectedHazardCounter: {
      fontSize: 7,
      fontWeight: '900',
      color: '#2563EB',
    },

    cleanSelectedHazardTitle: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
      color: '#111827',
    },

    cleanSelectedHazardClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanSelectedHazardSource: {
      marginTop: 7,
      fontSize: 8,
      color: '#64748B',
    },

    cleanSelectedHazardZoneNote: {
      marginTop: 5,
      fontSize: 7.5,
      lineHeight: 11,
      fontWeight: '700',
      color: '#B91C1C',
    },

    cleanSelectedHazardWeatherContext: {
      marginTop: 5,
      fontSize: 8,
      lineHeight: 12,
      fontWeight: '800',
      color: '#0369A1',
    },

    cleanSelectedHazardDetail: {
      marginTop: 3,
      fontSize: 8.5,
      lineHeight: 12,
      color: '#334155',
    },

    cleanSelectedHazardBottomRow: {
      marginTop: 7,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    cleanSelectedHazardCoordinates: {
      flex: 1,
      fontSize: 7.5,
      color: '#64748B',
    },

    cleanSelectedHazardDistance: {
      fontSize: 8,
      fontWeight: '900',
      color: '#111827',
    },

    cleanBrowseRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    cleanBrowseButton: {
      flex: 1,
      minHeight: 29,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanBrowseButtonText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#475569',
    },

    cleanViewAllButton: {
      flex: 1.25,
      minHeight: 29,
      borderRadius: 8,
      backgroundColor: '#111827',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanViewAllButtonText: {
      fontSize: 8,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    cleanInfoScroll: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },

    cleanInfoContent: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 18,
      gap: 9,
    },

    cleanWeatherContextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#BAE6FD',
      backgroundColor: '#F0F9FF',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },

    cleanWeatherContextIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E0F2FE',
    },

    cleanWeatherContextEyebrow: {
      fontSize: 7,
      fontWeight: '900',
      color: '#0369A1',
      letterSpacing: 0.4,
    },

    cleanWeatherContextTitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '900',
      color: '#0F172A',
    },

    cleanWeatherContextDetail: {
      marginTop: 2,
      fontSize: 8,
      lineHeight: 11,
      color: '#334155',
    },

    cleanWeatherContextSource: {
      marginTop: 3,
      fontSize: 6.8,
      color: '#64748B',
    },

    cleanAlertCard: {
      minHeight: 82,
      padding: 11,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    cleanAlertIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanAlertTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    cleanAlertEyebrow: {
      fontSize: 8,
      fontWeight: '900',
      color: '#B91C1C',
      textTransform: 'uppercase',
    },

    cleanAlertTitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '900',
      color: '#991B1B',
    },

    cleanAlertDetail: {
      marginTop: 2,
      fontSize: 9,
      color: '#7F1D1D',
    },

    cleanAlertSource: {
      marginTop: 4,
      fontSize: 7,
      color: '#B91C1C',
    },

    cleanAlertViewButton: {
      minWidth: 52,
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#FCA5A5',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanAlertViewText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#991B1B',
    },

    cleanSafeCard: {
      minHeight: 66,
      padding: 11,
      borderRadius: 12,
      backgroundColor: '#F0FDF4',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    cleanSafeIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanSafeTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#166534',
    },

    cleanSafeSubtext: {
      marginTop: 2,
      fontSize: 8,
      color: '#15803D',
    },

    cleanLegendCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      paddingTop: 8,
      paddingBottom: 7,
      overflow: 'hidden',
    },

    cleanLegendTitle: {
      paddingHorizontal: 10,
      marginBottom: 6,
      fontSize: 9.5,
      fontWeight: '900',
      color: '#111827',
    },

    cleanLegendScrollContent: {
      paddingHorizontal: 10,
      paddingRight: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },

    cleanLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexShrink: 0,
    },

    cleanLegendMarkerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 0.7,
      borderColor: 'rgba(15,23,42,0.08)',
      flexShrink: 0,
    },

    cleanLegendZoneSymbol: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#DC2626',
      backgroundColor: 'rgba(239,68,68,0.12)',
      flexShrink: 0,
    },

    cleanLegendItemText: {
      fontSize: 7.8,
      lineHeight: 10,
      fontWeight: '700',
      color: '#475569',
    },

    cleanFacilityRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
    },

    cleanFacilityCard: {
      flexGrow: 0,
      flexShrink: 0,
      padding: 11,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
    },

    cleanFacilityTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },

    cleanFacilityShelterIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ECFDF5',
    },

    cleanFacilityHospitalIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EFF6FF',
    },

    cleanFacilityLabel: {
      flex: 1,
      fontSize: 8.5,
      fontWeight: '800',
      color: '#64748B',
    },

    cleanFacilityValue: {
      minHeight: 29,
      fontSize: 10.5,
      lineHeight: 14,
      fontWeight: '900',
      color: '#111827',
    },

    cleanFacilityMeta: {
      marginTop: 3,
      minHeight: 22,
      fontSize: 10,
      lineHeight: 10,
      color: '#080808',
    },

    cleanFacilityButton: {
      minHeight: 34,
      marginTop: 'auto',
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
    },

    cleanFacilityButtonShelter: {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },

    cleanFacilityButtonHospital: {
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
    },

    cleanFacilityButtonSecondary: {
      backgroundColor: '#FFFFFF',
      borderColor: '#D1D5DB',
    },

    cleanFacilityButtonPressed: {
      opacity: 0.72,
    },

    cleanFacilityButtonText: {
      fontSize: 8.5,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    cleanFacilityButtonTextSecondary: {
      color: '#0F766E',
    },

    cleanFacilityButtonTextHospitalSecondary: {
      color: '#2563EB',
    },

    cleanHazardCarouselSection: {
      marginTop: 2,
    },

    cleanHazardCarouselHeader: {
      marginBottom: 8,
      paddingHorizontal: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    cleanHazardCarouselTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#111827',
    },

    cleanSwipeHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    cleanSwipeHintText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#020202',
    },

    cleanStatusHorizontalContent: {
      paddingRight: 12,
      gap: 10,
      alignItems: 'stretch',
    },

    cleanStatusCard: {
      flexGrow: 0,
      flexShrink: 0,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
    },

    cleanStatusCardAvailable: {
      borderColor: '#D7E3EA',
    },

    cleanStatusCardPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.985 }],
    },

    cleanStatusCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },

    cleanStatusEmptyCard: {
      minHeight: 64,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    cleanStatusIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanStatusIconNeutral: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
    },

    cleanStatusEmoji: {
      fontSize: 15,
    },

    cleanStatusTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    cleanStatusTitle: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#334155',
    },

    cleanStatusSubtext: {
      marginTop: 2,
      fontSize: 7.5,
      color: '#94A3B8',
    },

    cleanStatusCardTitle: {
      minHeight: 22,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '900',
      color: '#1E293B',
    },

    cleanStatusCardSubtext: {
      minHeight: 16,
      marginTop: 3,
      paddingRight: 4,
      fontSize: 10,
      lineHeight: 11,
      color: '#090909',
    },

    cleanStatusViewPill: {
      paddingLeft: 8,
      paddingRight: 6,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#F1F5F9',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },

    cleanStatusViewPillText: {
      fontSize: 7,
      fontWeight: '900',
      color: '#475569',
    },

    cleanStatusCardAccent: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      opacity: 0.82,
      
    },

    cleanClearPill: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#F0FDF4',
    },

    cleanClearPillText: {
      fontSize: 7,
      fontWeight: '900',
      color: '#15803D',
    },


    cleanDataSourceText: {
      marginTop: 1,
      textAlign: 'center',
      fontSize: 6.8,
      color: '#030303',
    },

  });