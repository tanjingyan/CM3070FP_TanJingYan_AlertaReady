import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
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

  if (nextLevelXp === currentLevelXp) {
    return 100;
  }

  const progress =
    ((xp - currentLevelXp) /
      (nextLevelXp - currentLevelXp)) *
    100;

  return Math.min(Math.max(progress, 0), 100);
}

const modules = [
  {
    id: 'emergencyKit',
    number: 1,
    icon: '🎒',
    title: 'Build Emergency Kit',
    description:
      'Learn what to prepare and build a practical emergency kit.',
    reward: 50,
  },
  {
    id: 'familyPlan',
    number: 2,
    icon: '👨‍👩‍👧',
    title: 'Family Emergency Plan',
    description:
      'Create a simple communication and meeting plan for your household.',
    reward: 40,
  },
  {
    id: 'evacuationRoute',
    number: 3,
    icon: '🏃',
    title: 'Know Your Evacuation Route',
    description:
      'Understand how to choose and practise a safe evacuation route.',
    reward: 30,
  },
  {
    id: 'documents',
    number: 4,
    icon: '📄',
    title: 'Secure Important Documents',
    description:
      'Learn how to keep important records protected and accessible.',
    reward: 20,
  },
  {
    id: 'firstAid',
    number: 5,
    icon: '⛑️',
    title: 'Learn Basic First Aid',
    description:
      'Review basic first-aid preparation and essential response steps.',
    reward: 20,
  },
];

export default function TasksScreen() {
  const { userData } = useUserProgress();

  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(
    userData.xp,
    userData.level
  );

  const completedModules = modules.filter((module) =>
    userData.completedTasks.includes(module.title)
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Preparedness Modules
            </Text>
            <Text style={styles.subtitle}>
              Learn, practise and test your emergency preparedness skills.
            </Text>
          </View>

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Level {userData.level}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>
              {userData.preparedness}%
            </Text>
          </View>

          <View style={styles.progressContent}>
            <View style={styles.progressTitleRow}>
              <Text style={styles.progressTitle}>
                Overall Progress
              </Text>
              <Text style={styles.moduleCount}>
                {completedModules}/{modules.length} modules
              </Text>
            </View>

            <Text style={styles.progressSub}>
              Complete modules to improve preparedness and earn XP.
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${levelProgress}%` },
                ]}
              />
            </View>

            <View style={styles.xpRow}>
              <Text style={styles.xpText}>
                {userData.xp} / {nextLevelXp} XP
              </Text>
              <Text style={styles.nextLevelText}>
                Next level
              </Text>
            </View>
          </View>
        </View>

        {/* Module explanation */}
        <View style={styles.learningFlowCard}>
          <Text style={styles.learningFlowTitle}>
            How each module works
          </Text>

          <View style={styles.learningStepsRow}>
            <View style={styles.learningStep}>
              <View style={styles.learningStepNumber}>
                <Text style={styles.learningStepNumberText}>1</Text>
              </View>
              <Text style={styles.learningStepText}>Learn</Text>
            </View>

            <Text style={styles.learningArrow}>›</Text>

            <View style={styles.learningStep}>
              <View style={styles.learningStepNumber}>
                <Text style={styles.learningStepNumberText}>2</Text>
              </View>
              <Text style={styles.learningStepText}>Checklist</Text>
            </View>

            <Text style={styles.learningArrow}>›</Text>

            <View style={styles.learningStep}>
              <View style={styles.learningStepNumber}>
                <Text style={styles.learningStepNumberText}>3</Text>
              </View>
              <Text style={styles.learningStepText}>Quiz</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Your Modules
          </Text>
          <Text style={styles.sectionSubtitle}>
            Complete each module in order or revisit any unlocked module.
          </Text>
        </View>

        <View style={styles.moduleList}>
          {modules.map((module) => {
            const completed =
              userData.completedTasks.includes(module.title);

            return (
              <ModuleCard
                key={module.id}
                number={module.number}
                icon={module.icon}
                title={module.title}
                description={module.description}
                reward={module.reward}
                completed={completed}
                onPress={() =>
                  router.push({
                    pathname: '/task-details',
                    params: {
                      taskId: module.id,
                    },
                  } as any)
                }
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({
  number,
  icon,
  title,
  description,
  reward,
  completed,
  onPress,
}: {
  number: number;
  icon: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.moduleCard,
        completed && styles.moduleCardCompleted,
        pressed && styles.moduleCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.moduleTopRow}>
        <View style={styles.moduleNumberPill}>
          <Text style={styles.moduleNumberText}>
            MODULE {number}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            completed && styles.statusPillCompleted,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              completed && styles.statusTextCompleted,
            ]}
          >
            {completed ? 'Completed' : '3 sections'}
          </Text>
        </View>
      </View>

      <View style={styles.moduleMainRow}>
        <View
          style={[
            styles.moduleIconBox,
            completed && styles.moduleIconBoxCompleted,
          ]}
        >
          <Text style={styles.moduleIcon}>
            {icon}
          </Text>
        </View>

        <View style={styles.moduleInfo}>
          <Text
            style={[
              styles.moduleTitle,
              completed && styles.moduleTitleCompleted,
            ]}
          >
            {title}
          </Text>

          <Text
            style={styles.moduleDescription}
            numberOfLines={2}
          >
            {description}
          </Text>

          <View style={styles.moduleMetaRow}>
            <Text style={styles.moduleMeta}>
              Learn • Checklist • Quiz
            </Text>

            <View style={styles.rewardPill}>
              <Text style={styles.rewardText}>
                ⚡ +{reward} XP
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
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
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    marginTop: 4,
    maxWidth: 280,
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },

  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },

  levelBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#047857',
  },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 17,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#079455',
  },

  progressCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressPercent: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  progressContent: {
    flex: 1,
  },

  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  moduleCount: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D1FAE5',
  },

  progressSub: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 14,
    color: '#D1FAE5',
  },

  progressBar: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#34D399',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },

  xpRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  xpText: {
    fontSize: 10,
    color: '#FFFFFF',
  },

  nextLevelText: {
    fontSize: 9,
    color: '#D1FAE5',
  },

  learningFlowCard: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  learningFlowTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  learningStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  learningStep: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },

  learningStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  learningStepNumberText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },

  learningStepText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },

  learningArrow: {
    marginTop: -14,
    fontSize: 18,
    color: '#9CA3AF',
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: '#6B7280',
  },

  moduleList: {
    gap: 11,
  },

  moduleCard: {
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  moduleCardCompleted: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },

  moduleCardPressed: {
    opacity: 0.78,
  },

  moduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  moduleNumberPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },

  moduleNumberText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#6B7280',
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },

  statusPillCompleted: {
    backgroundColor: '#DCFCE7',
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#C2410C',
  },

  statusTextCompleted: {
    color: '#15803D',
  },

  moduleMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  moduleIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },

  moduleIconBoxCompleted: {
    backgroundColor: '#DCFCE7',
  },

  moduleIcon: {
    fontSize: 22,
  },

  moduleInfo: {
    flex: 1,
    minWidth: 0,
  },

  moduleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },

  moduleTitleCompleted: {
    color: '#166534',
  },

  moduleDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: '#6B7280',
  },

  moduleMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  moduleMeta: {
    flex: 1,
    fontSize: 8,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  rewardPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },

  rewardText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#92400E',
  },

  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
});
