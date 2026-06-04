import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.topSection} />

      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>🛡️</Text>
        </View>

        <Text style={styles.title}>AlertaReady</Text>
        <Text style={styles.subtitle}>Stay prepared. Stay safe.</Text>

        <Pressable style={styles.button} onPress={() => router.push('/register' as any)}>
          <Text style={styles.buttonText}>GET STARTED</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/login' as any)}>
          <Text style={styles.loginText}>ALREADY HAVE AN ACCOUNT? LOG IN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  topSection: {
    flex: 1,
  },
  card: {
    flex: 1.35,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 42,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    fontSize: 34,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  subtitle: {
    fontSize: 13,
    color: '#9A8FB8',
    marginTop: 8,
    marginBottom: 34,
  },
  button: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loginText: {
    fontSize: 11,
    color: '#6B5C91',
    fontWeight: 'bold',
  },
});