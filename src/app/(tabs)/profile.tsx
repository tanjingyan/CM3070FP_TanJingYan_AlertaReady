import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';

export default function ProfileScreen() {
  const displayName = auth.currentUser?.displayName || 'User';
  const email = auth.currentUser?.email || 'No email';

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.menu}>☰</Text>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.settings}>⚙️</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.levelBadge}>Level 3 · Ready Responder</Text>
          </View>

          <Text style={styles.medal}>🏅</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>650 XP</Text>
            <Text style={styles.statLabel}>Total Experience</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Progress</Text>
            <Text style={styles.levelText}>Level 3</Text>
          </View>

          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>650 / 1000 XP</Text>
            <Text style={styles.progressText}>Next Level: 1000 XP</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Badges</Text>
            <Text style={styles.viewAll}>View All</Text>
          </View>

          <View style={styles.badgeRow}>
            <Badge icon="🌲" title="First Step" />
            <Badge icon="✅" title="Task Master" />
            <Badge icon="⭐" title="Safety Hero" />
            <Badge icon="👥" title="Community Helper" />
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuItem icon="🕒" title="My Activity" subtitle="View your task history and progress" />
          <MenuItem icon="🔖" title="Saved Resources" subtitle="Your saved guides and contacts" />
          <MenuItem icon="👥" title="Share the App" subtitle="Invite friends and family" />
          <MenuItem icon="❓" title="Help & Support" subtitle="FAQs and support" />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.badgeItem}>
      <View style={styles.badgeIcon}>
        <Text style={styles.badgeEmoji}>{icon}</Text>
      </View>
      <Text style={styles.badgeTitle}>{title}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  menu: {
    fontSize: 24,
    marginRight: 20,
  },

  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },

  settings: {
    fontSize: 22,
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

  avatarText: {
    fontSize: 38,
  },

  userInfo: {
    flex: 1,
  },

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

  medal: {
    fontSize: 48,
  },

  statsRow: {
    backgroundColor: '#079455',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    marginBottom: 14,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
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
    width: '65%',
    height: '100%',
    backgroundColor: '#16A34A',
  },

  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },

  viewAll: {
    color: '#2563EB',
    fontWeight: '600',
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

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    elevation: 2,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },

  menuTitle: {
    fontWeight: 'bold',
    color: '#111827',
  },

  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  arrow: {
    fontSize: 28,
    color: '#9CA3AF',
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