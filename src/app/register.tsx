// Create account screen

import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleRegister() {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard' as any);
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection} />

      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>🛡️</Text>
        </View>

        <Text style={styles.title}>Create Account</Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <Pressable style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>SIGN UP</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/login' as any)}>
          <Text style={styles.linkText}>ALREADY HAVE AN ACCOUNT? LOG IN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B5CF6' },
  topSection: { flex: 1 },

  card: {
    flex: 1.6,
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
    fontSize: 25,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 26,
  },

  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },

  button: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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