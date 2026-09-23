import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
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

import { auth, db } from '../firebase/firebaseConfig';

export default function EditProfileScreen() {
  const user = auth.currentUser;

  const [displayName, setDisplayName] =
    useState('');
  const [homeArea, setHomeArea] =
    useState('');
  const [
    emergencyContact,
    setEmergencyContact,
  ] = useState('');
  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!user) return;

    setDisplayName(
      user.displayName ?? ''
    );

    return onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        setDisplayName(
          String(
            data.displayName ??
              user.displayName ??
              ''
          )
        );

        setHomeArea(
          String(data.homeArea ?? '')
        );

        setEmergencyContact(
          String(
            data.emergencyContact ?? ''
          )
        );
      }
    );
  }, [user?.uid]);

  async function saveChanges() {
    if (!user) {
      Alert.alert(
        'Not signed in',
        'Please log in again.'
      );
      return;
    }

    const cleanedName =
      displayName.trim();

    if (!cleanedName) {
      Alert.alert(
        'Display name required',
        'Please enter a display name.'
      );
      return;
    }

    try {
      setSaving(true);

      await updateProfile(user, {
        displayName: cleanedName,
      });

      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: cleanedName,
          homeArea:
            homeArea.trim(),
          emergencyContact:
            emergencyContact.trim(),
          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        'Profile updated',
        'Your profile changes have been saved.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.back(),
          },
        ]
      );
    } catch (error) {
      console.warn(
        'Profile update error:',
        error
      );

      Alert.alert(
        'Unable to save',
        'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function changePhoto() {
    Alert.alert(
      'Profile photo',
      'The new profile layout is ready. Photo upload can be connected to Firebase Storage separately.'
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#111827"
              />
            </Pressable>

            <Text style={styles.title}>
              Edit profile
            </Text>
          </View>

          <View style={styles.photoSection}>
            <View style={styles.avatar}>
              <Ionicons
                name="person-outline"
                size={38}
                color="#1457A6"
              />

              <Pressable
                style={
                  styles.cameraButton
                }
                onPress={changePhoto}
              >
                <Ionicons
                  name="camera"
                  size={12}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={changePhoto}
            >
              <Text
                style={
                  styles.changePhotoText
                }
              >
                Change photo
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>
            Display name
          </Text>

          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={
              setDisplayName
            }
            placeholder="Your display name"
          />

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.disabledInput,
            ]}
            value={user?.email ?? ''}
            editable={false}
          />

          <Text style={styles.helper}>
            Email cannot be changed here.
          </Text>

          <Text style={styles.label}>
            Home area
          </Text>

          <TextInput
            style={styles.input}
            value={homeArea}
            onChangeText={setHomeArea}
            placeholder="e.g. Bukit Timah, Singapore"
          />

          <Text style={styles.helper}>
            Used to personalise preparedness information. Your current GPS location is still used for live map features.
          </Text>

          <Text style={styles.label}>
            Emergency contact
          </Text>

          <TextInput
            style={styles.input}
            value={emergencyContact}
            onChangeText={
              setEmergencyContact
            }
            placeholder="Name and phone number"
          />

          <Text style={styles.helper}>
            For detailed trusted contacts, use the Emergency Contacts section in the Resource Hub.
          </Text>

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            disabled={saving}
            onPress={saveChanges}
          >
            <Text style={styles.saveText}>
              {saving
                ? 'Saving...'
                : 'Save changes'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            disabled={saving}
            onPress={() =>
              router.back()
            }
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 38,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9EAFE',
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '800',
    color: '#1457A6',
  },
  label: {
    marginTop: 11,
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 11,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  helper: {
    marginTop: 4,
    fontSize: 8,
    lineHeight: 12,
    color: '#9CA3AF',
  },
  saveButton: {
    minHeight: 46,
    marginTop: 24,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelButton: {
    minHeight: 46,
    marginTop: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
});
