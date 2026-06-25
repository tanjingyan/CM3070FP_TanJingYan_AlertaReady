import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
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
  const currentLevelXp = getCurrentLevelXp(level);
  const nextLevelXp = getNextLevelXp(level);

  const progress =
    ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  return Math.min(Math.max(progress, 0), 100);
}

export default function ProfileScreen() {
  const { userData } = useUserProgress();

  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(userData.xp, userData.level);

  const badges = [
    {
      id: 1,
      icon: '🌲',
      title: 'First Step',
      unlocked: userData.completedTasks.length >= 1,
    },
    {
      id: 2,
      icon: '✅',
      title: 'Task Master',
      unlocked: userData.completedTasks.length >= 5,
    },
    {
      id: 3,
      icon: '⭐',
      title: 'Safety Hero',
      unlocked: userData.xp >= 100,
    },
    {
      id: 4,
      icon: '👥',
      title: 'Helper',
      unlocked: userData.completedTasks.length >= 10,
    },
  ];

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace('/login' as any);
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{userData.displayName}</Text>
            <Text style={styles.email}>{userData.email}</Text>
            <Text style={styles.levelBadge}>
              Level {userData.level} · Ready Responder
            </Text>
          </View>

          <Text style={styles.medal}>🏅</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userData.xp} XP</Text>
            <Text style={styles.statLabel}>Total Experience</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {userData.completedTasks.length}
            </Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Progress</Text>
            <Text style={styles.levelText}>Level {userData.level}</Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${levelProgress}%` }]}
            />
          </View>

          <Text style={styles.progressText}>
            {userData.xp} / {nextLevelXp} XP
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Badges</Text>

          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <Badge
                key={badge.id}
                icon={badge.icon}
                title={badge.title}
                unlocked={badge.unlocked}
              />
            ))}
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({
  icon,
  title,
  unlocked,
}: {
  icon: string;
  title: string;
  unlocked: boolean;
}) {
  return (
    <View style={[styles.badgeItem, !unlocked && styles.lockedBadge]}>
      <View style={styles.badgeIcon}>
        <Text style={styles.badgeEmoji}>{unlocked ? icon : '🔒'}</Text>
      </View>
      <Text style={styles.badgeTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },

  content: { padding: 18, paddingBottom: 100 },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },

  profileCard: {
    backgroundColor: '#079455',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  avatarText: { fontSize: 38 },

  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  email: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 3,
  },

  levelBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
  },

  medal: { fontSize: 42 },

  statsRow: {
    backgroundColor: '#079455',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    marginBottom: 14,
  },

  statBox: { flex: 1, alignItems: 'center' },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 4,
  },

  divider: {
    width: 1,
    backgroundColor: '#34D399',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 14,
  },

  levelText: {
    fontWeight: 'bold',
    color: '#111827',
  },

  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
  },

  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
  },

  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  badgeItem: {
    alignItems: 'center',
    width: '24%',
  },

  badgeIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  badgeEmoji: {
    fontSize: 24,
  },

  badgeTitle: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    color: '#374151',
  },

  lockedBadge: {
    opacity: 0.35,
  },

  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },

  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});