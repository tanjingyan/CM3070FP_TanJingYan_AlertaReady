import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { saveRotatedPushToken } from '../services/pushNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function openNotificationTarget(
  data: Record<string, unknown> | undefined
) {
  const screen = String(data?.screen ?? '');

  if (screen === 'map') {
    router.push('/(tabs)/map' as any);
    return;
  }

  router.push('/(tabs)/alerts' as any);
}

export function useNotificationNavigation() {
  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(response => {
        openNotificationTarget(
          response.notification.request.content.data
        );
      });

    const tokenSubscription =
      Notifications.addPushTokenListener(token => {
        void saveRotatedPushToken(token.data);
      });

    void Notifications.getLastNotificationResponseAsync().then(
      response => {
        if (!response) return;

        openNotificationTarget(
          response.notification.request.content.data
        );
      }
    );

    return () => {
      responseSubscription.remove();
      tokenSubscription.remove();
    };
  }, []);
}
