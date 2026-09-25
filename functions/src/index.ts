import { initializeApp } from 'firebase-admin/app';

import {
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  getDistanceKm,
  isEarthquakeRelevant,
  isEonetEventRelevant,
} from './hazardLogic';

type WeatherRiskLevel =
  | 'Low Risk'
  | 'Moderate Risk'
  | 'High Risk';

function weatherRiskRank(
  level: WeatherRiskLevel
) {
  if (level === 'High Risk') return 3;
  if (level === 'Moderate Risk') return 2;
  return 1;
}

function getOverallWeatherRisk(
  levels: WeatherRiskLevel[]
): WeatherRiskLevel {
  return levels.reduce<WeatherRiskLevel>(
    (highest, current) =>
      weatherRiskRank(current) >
      weatherRiskRank(highest)
        ? current
        : highest,
    'Low Risk'
  );
}

function getRainFloodRisk(
  rain: number,
  precipitation: number,
  precipitationProbability: number,
  soilMoisture: number
): WeatherRiskLevel {
  if (
    rain >= 10 ||
    precipitation >= 10 ||
    precipitationProbability >= 80 ||
    (soilMoisture >= 0.45 &&
      precipitationProbability >= 60)
  ) {
    return 'High Risk';
  }

  if (
    rain >= 3 ||
    precipitation >= 3 ||
    precipitationProbability >= 50 ||
    (soilMoisture >= 0.35 &&
      precipitationProbability >= 40)
  ) {
    return 'Moderate Risk';
  }

  return 'Low Risk';
}

function getWindRisk(
  windSpeed: number,
  windGusts: number
): WeatherRiskLevel {
  if (
    windSpeed >= 60 ||
    windGusts >= 75
  ) {
    return 'High Risk';
  }

  if (
    windSpeed >= 40 ||
    windGusts >= 50
  ) {
    return 'Moderate Risk';
  }

  return 'Low Risk';
}

function getTemperatureRisk(
  temperature: number,
  apparentTemperature: number
): WeatherRiskLevel {
  const hottest =
    Math.max(
      temperature,
      apparentTemperature
    );

  const coldest =
    Math.min(
      temperature,
      apparentTemperature
    );

  if (
    hottest >= 40 ||
    coldest <= 0
  ) {
    return 'High Risk';
  }

  if (
    hottest >= 35 ||
    coldest <= 5
  ) {
    return 'Moderate Risk';
  }

  return 'Low Risk';
}

initializeApp();

const db = getFirestore();

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

const EONET_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';

type CandidateAlert = {
  key: string;
  type: string;
  title: string;
  body: string;
  source: string;
  sourceId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  priority: number;
  screen?: 'map' | 'alerts';
  isTest?: boolean;
};

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getEonetPoint(event: any) {
  const geometry =
    Array.isArray(event?.geometry)
      ? [...event.geometry]
          .reverse()
          .find(
            item =>
              item?.type === 'Point' &&
              Array.isArray(item?.coordinates) &&
              item.coordinates.length >= 2
          )
      : null;

  if (!geometry) return null;

  const longitude = Number(geometry.coordinates[0]);
  const latitude = Number(geometry.coordinates[1]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

async function sendAndStoreAlert(
  uid: string,
  fcmToken: string,
  alert: CandidateAlert
) {
  const alertId = safeId(alert.key);

  const alertRef =
    db.doc(`users/${uid}/alerts/${alertId}`);

  const previous = await alertRef.get();

  // Prevent duplicate pushes for the same external event.
  if (previous.exists) return false;

  await getMessaging().send({
    token: fcmToken,

    notification: {
      title: alert.title,
      body: alert.body,
    },

    data: {
      screen: alert.screen ?? 'map',
      alertId,
      source: alert.source,
      type: alert.type,
      isTest: alert.isTest ? 'true' : 'false',
    },

    android: {
      priority: 'high',
      notification: {
        channelId: 'hazard-alerts',
      },
    },
  });

  await alertRef.set({
    type: alert.type,
    title: alert.title,
    body: alert.body,
    source: alert.source,
    sourceId: alert.sourceId,
    latitude: alert.latitude,
    longitude: alert.longitude,
    distanceKm: alert.distanceKm,
    isTest: alert.isTest === true,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return true;
}


// --------------------------------------------------
// Development/demo test hazard
// Sends a clearly labelled simulated alert only to
// the currently authenticated user's own device.
// --------------------------------------------------
export const sendTestHazard =
  onCall(
    {
      region: 'us-central1',
    },
    async request => {
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'You must be signed in to send a test alert.'
        );
      }

      const uid = request.auth.uid;

      const userRef =
        db.doc(`users/${uid}`);

      const userSnapshot =
        await userRef.get();

      if (!userSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'User profile was not found.'
        );
      }

      const user = userSnapshot.data() ?? {};

      if (user.alertsEnabled !== true) {
        throw new HttpsError(
          'failed-precondition',
          'Enable Real-time hazard alerts before sending a test alert.'
        );
      }

      const fcmToken =
        String(user.fcmToken ?? '');

      if (!fcmToken) {
        throw new HttpsError(
          'failed-precondition',
          'No FCM token is registered for this device.'
        );
      }

      const latitude =
        Number(user.alertLatitude);

      const longitude =
        Number(user.alertLongitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new HttpsError(
          'failed-precondition',
          'No saved alert location is available. Refresh the alert location first.'
        );
      }

      const now = Date.now();

      const sent =
        await sendAndStoreAlert(
          uid,
          fcmToken,
          {
            key: `test_${uid}_${now}`,
            type: 'Test Hazard',
            title: '[TEST] Alerta Ready hazard simulation',
            body:
              'Simulation only — a test M5.2 earthquake is shown as 12 km from your saved alert location. There is no real hazard.',
            source: 'Alerta Ready Test',
            sourceId: `test_${now}`,
            latitude,
            longitude,
            distanceKm: 12,
            priority: 999,
            screen: 'alerts',
            isTest: true,
          }
        );

      if (!sent) {
        throw new HttpsError(
          'already-exists',
          'This test alert already exists.'
        );
      }

      logger.info(
        `Test hazard sent to user ${uid}.`
      );

      return {
        success: true,
      };
    }
  );

export const checkHazardsAndNotify =
  onSchedule(
    {
      schedule: '* * * * *',
      timeZone: 'UTC',
      maxInstances: 1,
    },
    async () => {
      logger.info('Starting Alerta Ready hazard check.');

      const usersSnapshot =
        await db
          .collection('users')
          .where('alertsEnabled', '==', true)
          .get();

      if (usersSnapshot.empty) {
        logger.info('No users have alerts enabled.');
        return;
      }

      const [usgsResponse, eonetResponse] =
        await Promise.all([
          fetch(USGS_URL),
          fetch(EONET_URL),
        ]);

      const usgs =
        usgsResponse.ok
          ? await usgsResponse.json()
          : { features: [] };

      const eonet =
        eonetResponse.ok
          ? await eonetResponse.json()
          : { events: [] };

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const uid = userDoc.id;

        const fcmToken =
          String(user.fcmToken ?? '');

        const userLat =
          Number(user.alertLatitude);

        const userLon =
          Number(user.alertLongitude);

        if (
          !fcmToken ||
          !Number.isFinite(userLat) ||
          !Number.isFinite(userLon)
        ) {
          continue;
        }

        const candidates: CandidateAlert[] = [];

        // --------------------------------------------------
        // USGS earthquakes
        // App-defined relevance:
        // M5+ <= 300 km
        // M4+ <= 100 km
        // M2.5+ <= 30 km
        // --------------------------------------------------
        for (const feature of usgs.features ?? []) {
          const coordinates =
            feature?.geometry?.coordinates;

          if (
            !Array.isArray(coordinates) ||
            coordinates.length < 2
          ) {
            continue;
          }

          const longitude = Number(coordinates[0]);
          const latitude = Number(coordinates[1]);
          const magnitude =
            Number(feature?.properties?.mag);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(magnitude)
          ) {
            continue;
          }

          const distanceKm =
            getDistanceKm(
              userLat,
              userLon,
              latitude,
              longitude
            );

          const relevant =
            isEarthquakeRelevant(
              magnitude,
              distanceKm
            );

          if (!relevant) continue;

          const sourceId =
            String(
              feature.id ??
                `${latitude}-${longitude}-${magnitude}`
            );

          candidates.push({
            key: `usgs_${sourceId}`,
            type: 'Earthquake',
            title: 'Earthquake detected nearby',
            body:
              `M${magnitude.toFixed(1)} earthquake approximately ` +
              `${distanceKm.toFixed(0)} km from your saved alert location. Source: USGS.`,
            source: 'USGS',
            sourceId,
            latitude,
            longitude,
            distanceKm,
            priority:
              magnitude * 10 - distanceKm / 100,
          });
        }

        // --------------------------------------------------
        // NASA EONET open Point events within 50 km
        // --------------------------------------------------
        for (const event of eonet.events ?? []) {
          const point = getEonetPoint(event);
          if (!point) continue;

          const distanceKm =
            getDistanceKm(
              userLat,
              userLon,
              point.latitude,
              point.longitude
            );

          if (
            !isEonetEventRelevant(
              distanceKm
            )
          ) {
            continue;
          }

          const sourceId =
            String(
              event.id ??
                event.title ??
                `${point.latitude}-${point.longitude}`
            );

          const category =
            String(
              event?.categories?.[0]?.title ??
                'Natural event'
            );

          candidates.push({
            key: `eonet_${sourceId}`,
            type: category,
            title: `${category} detected nearby`,
            body:
              `${String(event.title ?? category)} is approximately ` +
              `${distanceKm.toFixed(0)} km from your saved alert location. Source: NASA EONET.`,
            source: 'NASA EONET',
            sourceId,
            latitude: point.latitude,
            longitude: point.longitude,
            distanceKm,
            priority: 50 - distanceKm,
          });
        }

        // --------------------------------------------------
        // Open-Meteo multi-variable weather context
        //
        // Alerta Ready evaluates three prototype categories:
        // 1) Rain / flood context
        // 2) Wind risk
        // 3) Temperature extremes
        //
        // The overall weather risk is the highest category.
        // These are application-defined contextual indicators
        // and are NOT official emergency warnings.
        // --------------------------------------------------
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

          const weatherUrl =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${userLat}` +
            `&longitude=${userLon}` +
            `&hourly=${weatherVariables}` +
            `&forecast_hours=1` +
            `&wind_speed_unit=kmh`;

          const weatherResponse =
            await fetch(weatherUrl);

          if (weatherResponse.ok) {
            const weather =
              await weatherResponse.json();

            const precipitationProbability =
              Number(
                weather?.hourly
                  ?.precipitation_probability?.[0] ??
                  0
              );

            const rain =
              Number(
                weather?.hourly
                  ?.rain?.[0] ??
                  0
              );

            const precipitation =
              Number(
                weather?.hourly
                  ?.precipitation?.[0] ??
                  0
              );

            const soilMoisture =
              Number(
                weather?.hourly
                  ?.soil_moisture_0_to_1cm?.[0] ??
                  0
              );

            const windSpeed =
              Number(
                weather?.hourly
                  ?.wind_speed_10m?.[0] ??
                  0
              );

            const windGusts =
              Number(
                weather?.hourly
                  ?.wind_gusts_10m?.[0] ??
                  0
              );

            const temperature =
              Number(
                weather?.hourly
                  ?.temperature_2m?.[0] ??
                  0
              );

            const apparentTemperature =
              Number(
                weather?.hourly
                  ?.apparent_temperature?.[0] ??
                  0
              );

            const rainFloodRisk =
              getRainFloodRisk(
                rain,
                precipitation,
                precipitationProbability,
                soilMoisture
              );

            const windRisk =
              getWindRisk(
                windSpeed,
                windGusts
              );

            const temperatureRisk =
              getTemperatureRisk(
                temperature,
                apparentTemperature
              );

            const currentRisk =
              getOverallWeatherRisk([
                rainFloodRisk,
                windRisk,
                temperatureRisk,
              ]);

            const stateRef =
              db.doc(
                `users/${uid}/alertState/weather`
              );

            const previousState =
              await stateRef.get();

            const previousRisk =
              previousState.exists
                ? String(
                    previousState.data()?.riskLevel ??
                      'Unknown'
                  )
                : 'Unknown';

            // Notify only when the OVERALL state transitions
            // into High Risk, avoiding repeated 1-minute pushes.
            if (
              currentRisk === 'High Risk' &&
              previousRisk !== 'High Risk'
            ) {
              const highFactors = [
                rainFloodRisk === 'High Risk'
                  ? 'heavy rain / flood context'
                  : null,
                windRisk === 'High Risk'
                  ? 'strong wind'
                  : null,
                temperatureRisk === 'High Risk'
                  ? 'temperature extremes'
                  : null,
              ].filter(Boolean);

              const factorText =
                highFactors.length > 0
                  ? highFactors.join(', ')
                  : 'severe weather';

              const sourceId =
                `weather_${Date.now()}`;

              candidates.push({
                key: sourceId,
                type: 'Severe Weather',
                title:
                  'High weather risk detected',
                body:
                  `Alerta Ready detected high ${factorText} indicators for your saved alert location. ` +
                  'Source: Open-Meteo. Check official local warnings.',
                source: 'Open-Meteo',
                sourceId,
                latitude: userLat,
                longitude: userLon,
                distanceKm: 0,
                priority: 100,
              });
            }

            await stateRef.set(
              {
                riskLevel:
                  currentRisk,

                rainFloodRisk,
                windRisk,
                temperatureRisk,

                rain,
                precipitation,
                precipitationProbability,
                soilMoisture,

                windSpeed,
                windGusts,

                temperature,
                apparentTemperature,

                source:
                  'Open-Meteo',

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          } else {
            logger.warn(
              `Open-Meteo failed for ${uid}: ${weatherResponse.status}`
            );
          }
        } catch (error) {
          logger.warn(
            `Weather check failed for ${uid}`,
            error
          );
        }

        // Highest priority first, max 2 pushes per run.
        candidates.sort(
          (a, b) => b.priority - a.priority
        );

        let sentCount = 0;

        for (const candidate of candidates) {
          if (sentCount >= 2) break;

          try {
            const sent =
              await sendAndStoreAlert(
                uid,
                fcmToken,
                candidate
              );

            if (sent) sentCount += 1;
          } catch (error) {
            logger.error(
              `Push failed for ${uid}`,
              error
            );
          }
        }
      }

      logger.info('Alerta Ready hazard check finished.');
    }
  );
