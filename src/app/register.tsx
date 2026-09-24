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
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import {
  doc,
  setDoc,
} from 'firebase/firestore';

import { Ionicons } from '@expo/vector-icons';

import {
  auth,
  db,
} from '../firebase/firebaseConfig';

const PRIMARY = '#8B5CF6';
const PRIMARY_DARK = '#7C3AED';

const BACKGROUND = '#F7F5FF';

const TEXT = '#111827';
const SECONDARY_TEXT = '#6B7280';

const INPUT_BACKGROUND = '#FFFFFF';
const INPUT_BORDER = '#E5E1EE';

export default function RegisterScreen() {
  const [
    displayName,
    setDisplayName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleRegister() {
    if (!displayName.trim()) {
      Alert.alert(
        'Display name required',
        'Please enter your display name.'
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        'Email required',
        'Please enter your email address.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      Alert.alert(
        'Passwords do not match',
        'Please make sure both passwords are the same.'
      );
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      await updateProfile(
        userCredential.user,
        {
          displayName:
            displayName.trim(),
        }
      );

      await setDoc(
        doc(
          db,
          'users',
          userCredential.user.uid
        ),
        {
          displayName:
            displayName.trim(),

          email:
            email.trim(),

          xp: 0,

          preparedness: 0,

          level: 1,

          completedTasks: [],

          simulations: {},

          createdAt:
            new Date(),
        }
      );

      router.replace(
        '/(tabs)/dashboard' as any
      );
    } catch (error: any) {
      Alert.alert(
        'Sign up failed',
        error?.message ??
          'Unable to create your account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
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
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* BRAND */}

          <View style={styles.hero}>
            <View
              style={styles.logoCircle}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={27}
                color="#111827"
              />
            </View>

            <Text
              style={styles.brandName}
            >
              AlertaReady
            </Text>

            <Text
              style={styles.brandTagline}
            >
              Prepared. Informed. Ready.
            </Text>
          </View>

          {/* FORM */}

          <View
            style={styles.formSection}
          >
            <Text style={styles.title}>
              Create account
            </Text>

            <Text
              style={styles.description}
            >
              Start building your personal
              emergency preparedness plan.
            </Text>

            {/* DISPLAY NAME */}

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="person-outline"
                size={18}
                color="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor="#94A3B8"
                value={displayName}
                onChangeText={
                  setDisplayName
                }
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* EMAIL */}

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={
                  setEmail
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* PASSWORD */}

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={
                  setPassword
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoComplete="new-password"
              />

              <Pressable
                hitSlop={10}
                onPress={() =>
                  setShowPassword(
                    previous =>
                      !previous
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.passwordHint
              }
            >
              At least 6 characters
            </Text>

            {/* CONFIRM PASSWORD */}

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={
                  setConfirmPassword
                }
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoComplete="new-password"
                onSubmitEditing={
                  handleRegister
                }
              />

              <Pressable
                hitSlop={10}
                onPress={() =>
                  setShowConfirmPassword(
                    previous =>
                      !previous
                  )
                }
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            {/* SIGN UP BUTTON */}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,

                pressed &&
                  styles.primaryButtonPressed,

                loading &&
                  styles.primaryButtonDisabled,
              ]}
              disabled={loading}
              onPress={
                handleRegister
              }
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Sign up
                </Text>
              )}
            </Pressable>

            {/* LOGIN LINK */}

            <View
              style={styles.accountRow}
            >
              <Text
                style={
                  styles.accountText
                }
              >
                Already have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.push(
                    '/login' as any
                  )
                }
              >
                <Text
                  style={
                    styles.accountLink
                  }
                >
                  Log in
                </Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    container: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    scrollContent: {
      flexGrow: 1,
      backgroundColor:
        BACKGROUND,

      paddingBottom: 28,
    },

    /* -------------------------
       BRAND
       ------------------------- */

    hero: {
      minHeight: 270,

      alignItems: 'center',
      justifyContent: 'center',

      paddingTop: 30,
      paddingBottom: 25,
    },

    logoCircle: {
      width: 58,
      height: 58,

      borderRadius: 29,

      backgroundColor:
        'rgba(255,255,255,0.45)',

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 15,

      shadowColor: '#8B5CF6',
      shadowOpacity: 0.06,
      shadowRadius: 12,

      elevation: 1,
    },

    brandName: {
      fontSize: 21,

      fontWeight: '900',

      color: TEXT,
    },

    brandTagline: {
      marginTop: 5,

      fontSize: 10,

      fontWeight: '600',

      color: '#111827',
    },

    /* -------------------------
       FORM
       ------------------------- */

    formSection: {
      paddingHorizontal: 25,

      paddingTop: 8,

      paddingBottom: 30,
      
      marginTop: -45,
    },

    title: {
      fontSize: 24,

      fontWeight: '900',

      color: TEXT,
    },

    description: {
      marginTop: 5,

      marginBottom: 18,

      fontSize: 11,

      lineHeight: 16,

      color:
        SECONDARY_TEXT,
    },

    /* -------------------------
       INPUTS
       ------------------------- */

    inputContainer: {
      minHeight: 52,

      marginBottom: 11,

      paddingHorizontal: 15,

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        INPUT_BORDER,

      backgroundColor:
        INPUT_BACKGROUND,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      shadowColor: '#000000',

      shadowOpacity: 0.035,

      shadowRadius: 4,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 1,
    },

    input: {
      flex: 1,

      minHeight: 50,

      paddingVertical: 0,

      fontSize: 12.5,

      color: TEXT,
    },

    passwordHint: {
      marginTop: -6,

      marginLeft: 4,

      marginBottom: 9,

      fontSize: 8,

      color: '#94A3B8',
    },

    /* -------------------------
       SIGN UP BUTTON
       ------------------------- */

    primaryButton: {
      minHeight: 52,

      marginTop: 5,

      borderRadius: 14,

      backgroundColor:
        PRIMARY,

      alignItems: 'center',

      justifyContent:
        'center',

      shadowColor:
        PRIMARY,

      shadowOpacity: 0.2,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
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
      fontSize: 13,

      fontWeight: '900',

      color: '#FFFFFF',
    },

    /* -------------------------
       ACCOUNT LINK
       ------------------------- */

    accountRow: {
      marginTop: 18,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 4,
    },

    accountText: {
      fontSize: 10.5,

      color:
        SECONDARY_TEXT,
    },

    accountLink: {
      fontSize: 10.5,

      fontWeight: '900',

      color:
        PRIMARY_DARK,
    },

    /* -------------------------
       TERMS
       ------------------------- */

    termsText: {
      marginTop: 18,

      paddingHorizontal: 16,

      textAlign: 'center',

      fontSize: 8,

      lineHeight: 12,

      color: '#9CA3AF',
    },
  });