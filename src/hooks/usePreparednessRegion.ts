import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebase/firebaseConfig';
import {
  getPreparednessProfile,
  normalizeCountryCode,
} from '../data/preparednessByCountry';

type RegionMode = 'auto' | 'manual';

type RegionSettings = {
  mode: RegionMode;
  manualCountryCode: string | null;
  manualCountryName: string | null;
};

const DEFAULT_SETTINGS: RegionSettings = {
  mode: 'auto',
  manualCountryCode: null,
  manualCountryName: null,
};

export function usePreparednessRegion() {
  const user = auth.currentUser;

  const [settings, setSettings] =
    useState<RegionSettings>(DEFAULT_SETTINGS);

  const [settingsLoaded, setSettingsLoaded] =
    useState(false);

  const [detectedCountryCode, setDetectedCountryCode] =
    useState<string | null>(null);

  const [detectedCountryName, setDetectedCountryName] =
    useState<string | null>(null);

  const [detecting, setDetecting] = useState(false);
  const [detectionError, setDetectionError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setSettingsLoaded(true);
      return;
    }

    const settingsRef = doc(
      db,
      'users',
      user.uid,
      'settings',
      'preparednessRegion'
    );

    return onSnapshot(
      settingsRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setSettings({
            mode:
              data.mode === 'manual'
                ? 'manual'
                : 'auto',
            manualCountryCode:
              data.manualCountryCode
                ? normalizeCountryCode(
                    data.manualCountryCode
                  )
                : null,
            manualCountryName:
              data.manualCountryName
                ? String(data.manualCountryName)
                : null,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }

        setSettingsLoaded(true);
      },
      error => {
        console.warn(
          'Preparedness region settings error:',
          error
        );
        setSettings(DEFAULT_SETTINGS);
        setSettingsLoaded(true);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!settingsLoaded) return;

    if (settings.mode === 'auto') {
      detectCountry();
    }
  }, [settingsLoaded, settings.mode]);

  async function detectCountry() {
    try {
      setDetecting(true);
      setDetectionError(null);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setDetectionError(
          'Location permission is unavailable. Choose a region manually.'
        );
        return;
      }

      let location:
        | Location.LocationObject
        | null = null;

      try {
        location =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
      } catch (error) {
        location =
          await Location.getLastKnownPositionAsync();
      }

      if (!location) {
        setDetectionError(
          'Current location could not be determined. Choose a region manually.'
        );
        return;
      }

      const results =
        await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

      const address = results[0];

      if (!address) {
        setDetectionError(
          'The country could not be determined from the current location.'
        );
        return;
      }

      setDetectedCountryCode(
        normalizeCountryCode(
          address.isoCountryCode
        ) || null
      );

      setDetectedCountryName(
        address.country || null
      );
    } catch (error) {
      console.warn(
        'Preparedness region detection error:',
        error
      );

      setDetectionError(
        'Region detection failed. Choose a region manually.'
      );
    } finally {
      setDetecting(false);
    }
  }

  async function useAutomaticRegion() {
    setSettings(DEFAULT_SETTINGS);

    if (user) {
      await setDoc(
        doc(
          db,
          'users',
          user.uid,
          'settings',
          'preparednessRegion'
        ),
        {
          mode: 'auto',
          manualCountryCode: null,
          manualCountryName: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await detectCountry();
  }

  async function setManualRegion(
    countryCode: string,
    countryName: string
  ) {
    const next: RegionSettings = {
      mode: 'manual',
      manualCountryCode:
        normalizeCountryCode(countryCode),
      manualCountryName: countryName,
    };

    setSettings(next);

    if (user) {
      await setDoc(
        doc(
          db,
          'users',
          user.uid,
          'settings',
          'preparednessRegion'
        ),
        {
          ...next,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  const effectiveCountryCode =
    settings.mode === 'manual'
      ? settings.manualCountryCode
      : detectedCountryCode;

  const effectiveCountryName =
    settings.mode === 'manual'
      ? settings.manualCountryName
      : detectedCountryName;

  const profile = useMemo(
    () =>
      getPreparednessProfile(
        effectiveCountryCode,
        effectiveCountryName
      ),
    [
      effectiveCountryCode,
      effectiveCountryName,
    ]
  );

  return {
    mode: settings.mode,
    profile,
    detecting,
    detectionError,
    detectedCountryCode,
    detectedCountryName,
    effectiveCountryCode,
    effectiveCountryName,
    refreshDetectedRegion: detectCountry,
    useAutomaticRegion,
    setManualRegion,
  };
}
