// dashboard screen

import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export default function DashboardScreen() {

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace('/login' as any);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AlertaReady</Text>

      <Text style={styles.subtitle}>
        Login Successful 🎉
      </Text>

      <Text style={styles.text}>
        Welcome to your dashboard.
      </Text>

      <Pressable
        style={styles.button}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>LOG OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },

  button: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});