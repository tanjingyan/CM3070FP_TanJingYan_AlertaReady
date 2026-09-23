import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../../firebase/firebaseConfig';
import { useUserProgress } from '../../hooks/use-UserProgress';

function getCurrentLevelXp(level: number) {
  if (level === 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 500;
  return 1000;
}

function getNextLevelXp(level: number) {
  if (level === 1) return 100;
  if (level === 2) return 250;
  if (level === 3) return 500;
  if (level === 4) return 1000;
  return 1000;
}

function getLevelProgress(xp: number, level: number) {
  const current = getCurrentLevelXp(level);
  const next = getNextLevelXp(level);

  if (current === next) return 100;

  const value = ((xp - current) / (next - current)) * 100;
  return Math.min(Math.max(value, 0), 100);
}

function getLevelTitle(level: number) {
  if (level <= 1) return 'Ready Responder';
  if (level === 2) return 'Prepared Explorer';
  if (level === 3) return 'Safety Specialist';
  if (level === 4) return 'Preparedness Leader';
  return 'Preparedness Champion';
}

type ExtraProfileData = {
  homeArea: string;
  emergencyContact: string;
};

export default function ProfileScreen() {
  const { userData } = useUserProgress();
  const user = auth.currentUser;

  const [extraProfile, setExtraProfile] =
    useState<ExtraProfileData>({
      homeArea: '',
      emergencyContact: '',
    });

  useEffect(() => {
    if (!user) return;

    return onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        setExtraProfile({
          homeArea: String(data.homeArea ?? ''),
          emergencyContact: String(
            data.emergencyContact ?? ''
          ),
        });
      }
    );
  }, [user?.uid]);

  const completedCount =
    userData.completedTasks?.length ?? 0;

  const nextLevelXp =
    getNextLevelXp(userData.level);

  const levelProgress =
    getLevelProgress(
      userData.xp,
      userData.level
    );

  const badges = [
    {
      id: 'first-step',
      icon: 'leaf-outline' as const,
      title: 'First Step',
      subtitle: 'Complete 1 module',
      earned: completedCount >= 1,
    },
    {
      id: 'task-master',
      icon: 'clipboard-outline' as const,
      title: 'Task Master',
      subtitle: 'Complete 3 modules',
      earned: completedCount >= 3,
    },
    {
      id: 'safety-hero',
      icon: 'shield-checkmark-outline' as const,
      title: 'Safety Hero',
      subtitle: 'Complete all modules',
      earned: completedCount >= 5,
    },
    {
      id: 'prepared-pro',
      icon: 'heart-outline' as const,
      title: 'Prepared Pro',
      subtitle: 'Reach Level 3',
      earned: userData.level >= 3,
    },
  ];

  function confirmLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            router.replace('/login');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>
          Profile
        </Text>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={31}
              color="#1457A6"
            />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {userData.displayName ||
                user?.displayName ||
                'Alerta Ready User'}
            </Text>

            <Text style={styles.email}>
              {user?.email ??
                'No email available'}
            </Text>
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push('/edit-profile' as any)
            }
          >
            <Ionicons
              name="pencil-outline"
              size={14}
              color="#0A7A46"
            />
            <Text style={styles.editButtonText}>
              Edit
            </Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.levelText}>
              Level {userData.level} ·{' '}
              {getLevelTitle(
                userData.level
              )}
            </Text>

            <Text style={styles.xpFraction}>
              {userData.xp} / {nextLevelXp} XP
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${levelProgress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {userData.xp}
              </Text>
              <Text style={styles.statLabel}>
                Total XP
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {completedCount}
              </Text>
              <Text style={styles.statLabel}>
                Modules completed
              </Text>
            </View>
          </View>
        </View>

        {(extraProfile.homeArea ||
          extraProfile.emergencyContact) && (
          <View style={styles.detailsCard}>
            {extraProfile.homeArea ? (
              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#0A7A46"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>
                    Home area
                  </Text>
                  <Text style={styles.detailValue}>
                    {extraProfile.homeArea}
                  </Text>
                </View>
              </View>
            ) : null}

            {extraProfile.emergencyContact ? (
              <View style={styles.detailRow}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#0A7A46"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>
                    Emergency contact
                  </Text>
                  <Text style={styles.detailValue}>
                    {extraProfile.emergencyContact}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Your Badges
        </Text>

        <View style={styles.badgeGrid}>
          {badges.map(badge => (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                badge.earned &&
                  styles.badgeCardEarned,
              ]}
            >
              <View
                style={[
                  styles.badgeIconBox,
                  badge.earned &&
                    styles.badgeIconBoxEarned,
                ]}
              >
                <Ionicons
                  name={badge.icon}
                  size={20}
                  color={
                    badge.earned
                      ? '#0A7A46'
                      : '#94A3B8'
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.badgeTitle,
                    badge.earned &&
                      styles.badgeTitleEarned,
                  ]}
                >
                  {badge.title}
                </Text>
                <Text style={styles.badgeSubtitle}>
                  {badge.earned
                    ? 'Earned'
                    : badge.subtitle}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={confirmLogout}
        >
          <Text style={styles.logoutText}>
            Log out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 42,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 22,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9EAFE',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  email: {
    marginTop: 3,
    fontSize: 10,
    color: '#4B5563',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
  },
  editButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0A7A46',
  },
  progressCard: {
    padding: 16,
    marginBottom: 22,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  levelText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },
  xpFraction: {
    fontSize: 9,
    color: '#374151',
  },
  progressTrack: {
    height: 8,
    marginTop: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 34,
  },
  stat: {
    minWidth: 80,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 9,
    color: '#6B7280',
  },
  detailsCard: {
    padding: 14,
    marginBottom: 22,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
  },
  detailValue: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  sectionTitle: {
    marginBottom: 11,
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  badgeCard: {
    width: '48.5%',
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  badgeCardEarned: {
    borderColor: '#BBF7D0',
    backgroundColor: '#DCFCE7',
  },
  badgeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  badgeIconBoxEarned: {
    backgroundColor: '#ECFDF5',
  },
  badgeTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
  },
  badgeTitleEarned: {
    color: '#166534',
  },
  badgeSubtitle: {
    marginTop: 2,
    fontSize: 7,
    lineHeight: 10,
    color: '#94A3B8',
  },
  logoutButton: {
    minHeight: 45,
    marginTop: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
  },
});
