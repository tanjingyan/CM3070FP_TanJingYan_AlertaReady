import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { useUserProgress } from '../../hooks/use-UserProgress';

export default function TasksScreen() {
  const { userData, completeTask } = useUserProgress();

  async function handleComplete(taskName: string, reward: number) {
    if (userData.completedTasks.includes(taskName)) return;

    await completeTask(taskName, reward);
    Alert.alert('Task Completed!', `You earned +${reward} XP.`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Tasks</Text>

        <View style={styles.progressCard}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>{userData.preparedness}%</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressSub}>Complete tasks to improve preparedness.</Text>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${userData.preparedness}%` }]} />
            </View>

            <Text style={styles.xpText}>{userData.xp} / 1000 XP</Text>
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
            onPress={() => handleComplete('Build Emergency Kit', 50)}
          />

          <TaskItem
            icon="👨‍👩‍👧"
            title="Family Emergency Plan"
            description="Create or review your family emergency plan."
            xp="+40 XP"
            completed={userData.completedTasks.includes('Family Emergency Plan')}
            onPress={() => handleComplete('Family Emergency Plan', 40)}
          />

          <TaskItem
            icon="🏃"
            title="Know Your Evacuation Route"
            description="Learn the safest evacuation route."
            xp="+30 XP"
            completed={userData.completedTasks.includes('Know Your Evacuation Route')}
            onPress={() => handleComplete('Know Your Evacuation Route', 30)}
          />
        </View>

        <Text style={styles.sectionTitle}>More Tasks</Text>

        <View style={styles.taskList}>
          <TaskItem
            icon="📄"
            title="Secure Important Documents"
            description="Keep important documents safe and accessible."
            xp="+20 XP"
            completed={userData.completedTasks.includes('Secure Important Documents')}
            onPress={() => handleComplete('Secure Important Documents', 20)}
          />

          <TaskItem
            icon="⛑️"
            title="Learn Basic First Aid"
            description="Learn basic first aid skills."
            xp="+20 XP"
            completed={userData.completedTasks.includes('Learn Basic First Aid')}
            onPress={() => handleComplete('Learn Basic First Aid', 20)}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 18, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 18 },
  progressCard: { backgroundColor: '#079455', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  circle: { width: 76, height: 76, borderRadius: 38, borderWidth: 6, borderColor: '#BBF7D0', justifyContent: 'center', alignItems: 'center' },
  circleText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 20 },
  progressTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  progressSub: { color: '#DCFCE7', fontSize: 12, marginVertical: 6 },
  progressBar: { height: 7, backgroundColor: '#34D399', borderRadius: 8 },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 8 },
  xpText: { color: '#FFFFFF', fontSize: 11, marginTop: 5 },
  levelText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  taskList: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 6, marginBottom: 18, elevation: 2 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  check: { fontSize: 18, width: 22 },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  taskIcon: { fontSize: 22 },
  taskTitle: { fontWeight: 'bold', fontSize: 13, color: '#111827' },
  taskDesc: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  reward: { color: '#10B981', fontWeight: 'bold', fontSize: 11 },
});