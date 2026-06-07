import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
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

export default function TasksScreen() {
  const { userData } = useUserProgress();

  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(userData.xp, userData.level);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>My Tasks</Text>

        <View style={styles.progressCard}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>{userData.preparedness}%</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressSub}>
              Complete tasks to improve preparedness.
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${levelProgress}%` },
                ]}
              />
            </View>

            <Text style={styles.xpText}>
              {userData.xp} / {nextLevelXp} XP
            </Text>
          </View>

          <Text style={styles.levelText}>Level {userData.level}</Text>
        </View>

        <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>

        <View style={styles.taskList}>
          <TaskItem
            icon="💼"
            title="Build Emergency Kit"
            description="Make sure you have essential supplies."
            xp="+50 XP"
            completed={userData.completedTasks.includes('Build Emergency Kit')}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: { taskId: 'emergencyKit' },
              } as any)
            }
          />

          <TaskItem
            icon="👨‍👩‍👧"
            title="Family Emergency Plan"
            description="Create or review your family emergency plan."
            xp="+40 XP"
            completed={userData.completedTasks.includes('Family Emergency Plan')}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: { taskId: 'familyPlan' },
              } as any)
            }
          />

          <TaskItem
            icon="🏃"
            title="Know Your Evacuation Route"
            description="Learn the safest evacuation route."
            xp="+30 XP"
            completed={userData.completedTasks.includes(
              'Know Your Evacuation Route'
            )}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: { taskId: 'evacuationRoute' },
              } as any)
            }
          />
        </View>

        <Text style={styles.sectionTitle}>More Tasks</Text>

        <View style={styles.taskList}>
          <TaskItem
            icon="📄"
            title="Secure Important Documents"
            description="Keep important documents safe and accessible."
            xp="+20 XP"
            completed={userData.completedTasks.includes(
              'Secure Important Documents'
            )}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: { taskId: 'documents' },
              } as any)
            }
          />

          <TaskItem
            icon="⛑️"
            title="Learn Basic First Aid"
            description="Learn basic first aid skills."
            xp="+20 XP"
            completed={userData.completedTasks.includes('Learn Basic First Aid')}
            onPress={() =>
              router.push({
                pathname: '/task-details',
                params: { taskId: 'firstAid' },
              } as any)
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskItem({
  icon,
  title,
  description,
  xp,
  completed,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  xp: string;
  completed: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.taskItem} onPress={onPress}>
      <Text style={styles.check}>{completed ? '✅' : '○'}</Text>

      <View style={styles.iconBox}>
        <Text style={styles.taskIcon}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskDesc}>{description}</Text>
      </View>

      <Text style={styles.reward}>{completed ? 'Done' : xp}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 18,
    paddingBottom: 100,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 18,
  },

  progressCard: {
    backgroundColor: '#079455',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },

  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  circleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },

  progressTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  progressSub: {
    color: '#DCFCE7',
    fontSize: 12,
    marginVertical: 6,
  },

  progressBar: {
    height: 7,
    backgroundColor: '#34D399',
    borderRadius: 8,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },

  xpText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 5,
  },

  levelText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },

  taskList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    marginBottom: 18,
    elevation: 2,
  },

  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },

  check: {
    fontSize: 18,
    width: 22,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  taskIcon: {
    fontSize: 22,
  },

  taskTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#111827',
  },

  taskDesc: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },

  reward: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 11,
  },

  arrow: {
    fontSize: 22,
    color: '#9CA3AF',
  },
});