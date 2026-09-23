import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/firebaseConfig';

const ALERT_CHANNEL_ID = 'hazard-alerts';

async function ensureAndroidAlertChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
    name: 'Hazard alerts',
    description:
      'Location-aware disaster and severe hazard alerts from Alerta Ready.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
  });
}

async function getCurrentAlertLocation() {
  const currentPermission =
    await Location.getForegroundPermissionsAsync();

  let finalStatus = currentPermission.status;

  if (finalStatus !== Location.PermissionStatus.GRANTED) {
    const requested =
      await Location.requestForegroundPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== Location.PermissionStatus.GRANTED) {
    throw new Error(
      'Location permission is required for location-aware hazard alerts.'
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export async function enableRemoteAlerts() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in to enable alerts.');
  }

  await ensureAndroidAlertChannel();

  const currentPermission =
    await Notifications.getPermissionsAsync();

  let finalStatus = currentPermission.status;

  if (finalStatus !== 'granted') {
    const requested =
      await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const deviceToken =
    await Notifications.getDevicePushTokenAsync();

  const token =
    typeof deviceToken.data === 'string'
      ? deviceToken.data
      : JSON.stringify(deviceToken.data);

  const location = await getCurrentAlertLocation();

  await setDoc(
    doc(db, 'users', user.uid),
    {
      alertsEnabled: true,
      fcmToken: token,
      alertLatitude: location.latitude,
      alertLongitude: location.longitude,
      alertLocationUpdatedAt: serverTimestamp(),
      pushTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { token, ...location };
}

export async function refreshRemoteAlertLocation() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const location = await getCurrentAlertLocation();

  await setDoc(
    doc(db, 'users', user.uid),
    {
      alertLatitude: location.latitude,
      alertLongitude: location.longitude,
      alertLocationUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return location;
}

export async function disableRemoteAlerts() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in.');
  }

  await setDoc(
    doc(db, 'users', user.uid),
    {
      alertsEnabled: false,
      alertsDisabledAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveRotatedPushToken(tokenData: unknown) {
  const user = auth.currentUser;
  if (!user) return;

  const token =
    typeof tokenData === 'string'
      ? tokenData
      : JSON.stringify(tokenData);

  await setDoc(
    doc(db, 'users', user.uid),
    {
      fcmToken: token,
      pushTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
