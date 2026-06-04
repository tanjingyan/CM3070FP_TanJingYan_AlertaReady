// Login screen

import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.topSection} />

      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>🛡️</Text>
        </View>

        <Text style={styles.title}>Login</Text>

        <TextInput style={styles.input} placeholder="Email" />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry />

        <Text style={styles.forgotText}>FORGOT YOUR PASSWORD?</Text>

        <Pressable style={styles.button} onPress={() => router.push('/dashboard' as any)}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/register' as any)}>
          <Text style={styles.linkText}>CREATE NEW ACCOUNT?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B5CF6' },
  topSection: { flex: 1 },

  card: {
    flex: 1.5,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 36,
  },

  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F8F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  logo: { fontSize: 32 },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 28,
  },

  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },

  forgotText: {
    fontSize: 10,
    color: '#9A8FB8',
    marginBottom: 20,
  },

  button: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 18,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  linkText: {
    fontSize: 11,
    color: '#6B5C91',
    fontWeight: 'bold',
  },
});