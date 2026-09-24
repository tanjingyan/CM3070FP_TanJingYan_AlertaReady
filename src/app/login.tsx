import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '../firebase/firebaseConfig';

const PRIMARY = '#F7F5FF';
const PRIMARY_DARK = '#7C3AED';

const BACKGROUND = '#F7F5FF';
const INPUT_BACKGROUND = '#FFFFFF';

const TEXT = '#111827';
const SECONDARY_TEXT = '#6B7280';
const BORDER = '#E7E5F4';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [resetLoading, setResetLoading] =
    useState(false);

  async function handleLogin() {
    if (!email.trim()) {
      Alert.alert(
        'Email required',
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'Password required',
        'Please enter your password.'
      );
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.replace(
        '/(tabs)/dashboard' as any
      );
    } catch (error: any) {
      Alert.alert(
        'Login failed',
        error?.message ??
          'Unable to log in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert(
        'Enter your email',
        'Enter your email address first so Alerta Ready can send you a reset link.'
      );
      return;
    }

    try {
      setResetLoading(true);

      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      Alert.alert(
        'Reset email sent',
        'Check your email for instructions to reset your password.'
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to send reset email',
        error?.message ??
          'Please check your email address and try again.'
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PURPLE HEADER */}
          <View style={styles.heroSection}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={31}
                color="#000000"
              />
            </View>

            <Text style={styles.brandTitle}>
              AlertaReady
            </Text>

            <Text style={styles.brandSubtitle}>
              Prepared. Informed. Ready.
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.formSection}>
            <Text style={styles.heading}>
              Welcome back
            </Text>

            <Text style={styles.subheading}>
              Log in to continue your
              preparedness journey.
            </Text>

            {/* EMAIL */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#000000"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* PASSWORD */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#000000"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoComplete="password"
                onSubmitEditing={
                  handleLogin
                }
              />

              <Pressable
                hitSlop={10}
                onPress={() =>
                  setShowPassword(
                    previous => !previous
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={19}
                  color="#64748B"
                />
              </Pressable>
            </View>

            {/* FORGOT PASSWORD */}
            <Pressable
              style={styles.forgotButton}
              onPress={
                handleForgotPassword
              }
              disabled={resetLoading}
            >
              <Text style={styles.forgotText}>
                {resetLoading
                  ? 'Sending reset email...'
                  : 'Forgot password?'}
              </Text>
            </Pressable>

            {/* LOGIN */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  styles.primaryButtonPressed,
                loading &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Log in
                </Text>
              )}
            </Pressable>

            {/* CREATE ACCOUNT */}
            <View style={styles.accountRow}>
              <Text
                style={styles.accountText}
              >
                New to Alerta Ready?
              </Text>

              <Pressable
                onPress={() =>
                  router.push(
                    '/register' as any
                  )
                }
              >
                <Text
                  style={styles.accountLink}
                >
                  Create account
                </Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: BACKGROUND,
  },

  /* HEADER */

  heroSection: {
    minHeight: 255,
    backgroundColor: PRIMARY,

    alignItems: 'center',
    justifyContent: 'center',

    paddingTop: 20,
    paddingBottom: 40,

    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,

    backgroundColor:
      'rgba(255,255,255,0.16)',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },

  brandSubtitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },

  /* FORM */

  formSection: {
    flex: 1,

    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    marginTop: -45,
  },

  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT,
  },

  subheading: {
    marginTop: 6,
    marginBottom: 24,

    fontSize: 13,
    lineHeight: 19,

    color: SECONDARY_TEXT,
  },

  /* INPUTS */

  inputWrapper: {
    minHeight: 56,

    marginBottom: 13,

    paddingHorizontal: 15,

    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,

    backgroundColor:
      INPUT_BACKGROUND,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 11,

    shadowColor: '#000000',
    shadowOpacity: 0.025,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  input: {
    flex: 1,

    minHeight: 54,

    paddingVertical: 0,

    fontSize: 14,

    color: TEXT,
  },

  /* FORGOT */

  forgotButton: {
    alignSelf: 'flex-end',

    paddingVertical: 4,

    marginBottom: 18,
  },

  forgotText: {
    fontSize: 11,
    fontWeight: '800',

    color: PRIMARY_DARK,
  },

  /* LOGIN BUTTON */

  primaryButton: {
    minHeight: 54,

    borderRadius: 14,

    backgroundColor: PRIMARY_DARK,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  primaryButtonPressed: {
    backgroundColor:
      PRIMARY_DARK,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',

    color: '#FFFFFF',
  },

  /* ACCOUNT */

  accountRow: {
    marginTop: 20,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 4,
  },

  accountText: {
    fontSize: 12,

    color: SECONDARY_TEXT,
  },

  accountLink: {
    fontSize: 12,
    fontWeight: '900',

    color: PRIMARY_DARK,
  },

  termsText: {
    marginTop: 22,

    paddingHorizontal: 15,

    textAlign: 'center',

    fontSize: 9,
    lineHeight: 14,

    color: '#9CA3AF',
  },
});