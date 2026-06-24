// Create account screen

import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleRegister() {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your display name.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        displayName: displayName.trim(),
        email: email.trim(),
        xp: 0,
        preparedness: 0,
        level: 1,
        completedTasks: [],
        createdAt: new Date(),
      });

      router.replace('/(tabs)/dashboard' as any);
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection} />

        <View style={styles.card}>
          <View style={styles.logoCircle}>
            <Text style={styles.logo}>🛡️</Text>
          </View>

          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Pressable style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>SIGN UP</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/login' as any)}>
            <Text style={styles.linkText}>
              ALREADY HAVE AN ACCOUNT? LOG IN
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },

  scrollContent: {
    flexGrow: 1,
  },

  topSection: {
    flex: 0.35,
  },

  card: {
    flex: 2.2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 18,
  },

  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F8F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  logo: {
    fontSize: 28,
  },

  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 18,
  },

  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },

  button: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
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