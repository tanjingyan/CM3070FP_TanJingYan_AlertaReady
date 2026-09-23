import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';

export default function RootLayout() {
  useNotificationNavigation();
  
  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}