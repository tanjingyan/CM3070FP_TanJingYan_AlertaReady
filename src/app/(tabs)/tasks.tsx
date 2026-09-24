import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
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

const simulations = [
  {
    id: 'earthquake',
    icon: '🏚️',
    accent: '#7C3AED',
    soft: '#F5F3FF',
    border: '#DDD6FE',
    title: 'Earthquake Escape',
    description:
      'Make quick decisions during a sudden earthquake at home.',
    decisions: 3,
    reward: 30,
    difficulty: 'Beginner',
  },
  {
    id: 'wildfire',
    icon: '🔥',
    accent: '#DC2626',
    soft: '#FEF2F2',
    border: '#FECACA',
    title: 'Wildfire Evacuation',
    description:
      'Choose how to react when a wildfire threatens your area.',
    decisions: 3,
    reward: 30,
    difficulty: 'Beginner',
  },
  {
    id: 'flood',
    icon: '🌊',
    accent: '#0369A1',
    soft: '#F0F9FF',
    border: '#BAE6FD',
    title: 'Flash Flood Challenge',
    description:
      'Decide what to do as water rises around your neighbourhood.',
    decisions: 3,
    reward: 30,
    difficulty: 'Beginner',
  },
];

type PreparednessTab = 'modules' | 'simulations';


type SimulationProgress = {
  completed?: boolean;
  bestScore?: number;
  attempts?: number;
  lastScore?: number;
  xpAwarded?: number;
};

type SimulationProgressMap = Record<
  string,
  SimulationProgress
>;

export default function TasksScreen() {
  const { userData } = useUserProgress();
  const [activeTab, setActiveTab] =
    useState<PreparednessTab>('modules');

  const [simulationProgress, setSimulationProgress] =
    useState<SimulationProgressMap>({});

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setSimulationProgress({});
      return;
    }

    return onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        const data =
          snapshot.exists()
            ? snapshot.data()
            : {};

        const saved =
          data.simulations &&
          typeof data.simulations === 'object'
            ? data.simulations
            : {};

        setSimulationProgress(
          saved as SimulationProgressMap
        );
      },
      error => {
        console.warn(
          'Simulation progress read error:',
          error
        );
      }
    );
  }, [auth.currentUser?.uid]);

  const nextLevelXp = getNextLevelXp(userData.level);
  const levelProgress = getLevelProgress(
    userData.xp,
    userData.level
  );

  const completedModules = modules.filter((module) =>
    userData.completedTasks.includes(module.title)
  ).length;

  const completedSimulations =
    simulations.filter(
      simulation =>
        simulationProgress[
          simulation.id
        ]?.completed === true
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
              Preparedness
            </Text>
            <Text style={styles.subtitle}>
              Learn essential skills and practise emergency decisions.
            </Text>
          </View>

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Level {userData.level}
            </Text>
          </View>
        </View>

        {/* Overall Progress */}
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
              Complete learning modules and simulations to strengthen preparedness.
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

        {/* Section switcher */}
        <View style={styles.segmentedControl}>
          <Pressable
            onPress={() => setActiveTab('modules')}
            style={[
              styles.segmentButton,
              activeTab === 'modules' &&
                styles.segmentButtonActive,
            ]}
          >
            <Text style={styles.segmentIcon}>📚</Text>
            <View>
              <Text
                style={[
                  styles.segmentTitle,
                  activeTab === 'modules' &&
                    styles.segmentTitleActive,
                ]}
              >
                Modules
              </Text>
              <Text style={styles.segmentSub}>
                Learn & test
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('simulations')}
            style={[
              styles.segmentButton,
              activeTab === 'simulations' &&
                styles.segmentButtonActive,
            ]}
          >
            <Text style={styles.segmentIcon}>🎮</Text>
            <View>
              <Text
                style={[
                  styles.segmentTitle,
                  activeTab === 'simulations' &&
                    styles.segmentTitleActive,
                ]}
              >
                Simulations
              </Text>
              <Text style={styles.segmentSub}>
                {completedSimulations}/{simulations.length} completed
              </Text>
            </View>
          </Pressable>
        </View>

        {activeTab === 'modules' ? (
          <>
            {/* Module explanation */}
            <View style={styles.learningFlowCard}>
              <View style={styles.flowHeaderRow}>
                <View>
                  <Text style={styles.learningFlowTitle}>
                    How each module works
                  </Text>
                  <Text style={styles.flowSubtitle}>
                    Build knowledge step by step.
                  </Text>
                </View>

                <View style={styles.learningPill}>
                  <Text style={styles.learningPillText}>
                    LEARN
                  </Text>
                </View>
              </View>

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
                Learning Modules
              </Text>
              <Text style={styles.sectionSubtitle}>
                Complete each module or revisit anything you have already unlocked.
              </Text>
            </View>

            <View style={styles.moduleList}>
              {modules.map((module) => {
                const completed =
                  userData.completedTasks.includes(
                    module.title
                  );

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
          </>
        ) : (
          <>
            {/* Simulation explanation */}
            <View style={styles.simulationHero}>
              <View style={styles.simulationHeroIcon}>
                <Text style={styles.simulationHeroEmoji}>
                  🎮
                </Text>
              </View>

              <View style={styles.simulationHeroText}>
                <View style={styles.simulationHeroTitleRow}>
                  <Text style={styles.simulationHeroTitle}>
                    Disaster Simulations
                  </Text>

                  <View style={styles.practicePill}>
                    <Text style={styles.practicePillText}>
                      PRACTISE
                    </Text>
                  </View>
                </View>

                <Text style={styles.simulationHeroDescription}>
                  Enter short emergency scenes, choose between two actions and see the consequence of your decision.
                </Text>
              </View>
            </View>

            <View style={styles.simulationFlowCard}>
              <Text style={styles.simulationFlowTitle}>
                How simulations work
              </Text>

              <View style={styles.simulationFlowRow}>
                <View style={styles.simulationFlowStep}>
                  <Text style={styles.simulationFlowEmoji}>
                    🎬
                  </Text>
                  <Text style={styles.simulationFlowStepTitle}>
                    Scene
                  </Text>
                  <Text style={styles.simulationFlowStepSub}>
                    See the emergency
                  </Text>
                </View>

                <Text style={styles.simulationFlowArrow}>
                  ›
                </Text>

                <View style={styles.simulationFlowStep}>
                  <Text style={styles.simulationFlowEmoji}>
                    👆
                  </Text>
                  <Text style={styles.simulationFlowStepTitle}>
                    Choose
                  </Text>
                  <Text style={styles.simulationFlowStepSub}>
                    Pick 1 of 2 actions
                  </Text>
                </View>

                <Text style={styles.simulationFlowArrow}>
                  ›
                </Text>

                <View style={styles.simulationFlowStep}>
                  <Text style={styles.simulationFlowEmoji}>
                    🏆
                  </Text>
                  <Text style={styles.simulationFlowStepTitle}>
                    Result
                  </Text>
                  <Text style={styles.simulationFlowStepSub}>
                    Learn & earn XP
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Simulation Games
                </Text>

                <View style={styles.newPill}>
                  <Text style={styles.newPillText}>
                    NEW
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionSubtitle}>
                Practise what you would do during a real emergency.
              </Text>
            </View>

            <View style={styles.simulationList}>
              {simulations.map((simulation) => {
                const progress =
                  simulationProgress[
                    simulation.id
                  ];

                return (
                  <SimulationCard
                    key={simulation.id}
                    {...simulation}
                    completed={
                      progress?.completed === true
                    }
                    bestScore={
                      Number(
                        progress?.bestScore ?? 0
                      )
                    }
                    attempts={
                      Number(
                        progress?.attempts ?? 0
                      )
                    }
                    onPress={() =>
                      router.push({
                        pathname: '/simulation',
                        params: {
                          scenario:
                            simulation.id,
                        },
                      } as any)
                    }
                  />
                );
              })}
            </View>
          </>
        )}
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
        pressed && styles.cardPressed,
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

function SimulationCard({
  icon,
  accent,
  soft,
  border,
  title,
  description,
  decisions,
  reward,
  difficulty,
  completed,
  bestScore,
  attempts,
  onPress,
}: {
  icon: string;
  accent: string;
  soft: string;
  border: string;
  title: string;
  description: string;
  decisions: number;
  reward: number;
  difficulty: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.simulationCard,
        {
          backgroundColor: soft,
          borderColor: border,
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.simulationCardTopRow}>
        <View
          style={[
            styles.simulationIconBox,
            { backgroundColor: '#FFFFFF' },
          ]}
        >
          <Text style={styles.simulationIcon}>
            {icon}
          </Text>
        </View>

        <View style={styles.simulationTopBadges}>
          {completed && (
            <View style={styles.simulationCompletedPill}>
              <Text style={styles.simulationCompletedText}>
                ✓ Completed
              </Text>
            </View>
          )}

          <View style={styles.simulationDifficultyPill}>
            <Text style={styles.simulationDifficultyText}>
              {difficulty}
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={[
          styles.simulationTitle,
          { color: accent },
        ]}
      >
        {title}
      </Text>

      <Text style={styles.simulationDescription}>
        {description}
      </Text>

      <View style={styles.simulationDivider} />

      <View style={styles.simulationBottomRow}>
        <View style={styles.simulationStats}>
          <Text style={styles.simulationMeta}>
            🎯 {decisions} decisions
          </Text>

          <Text style={styles.simulationMeta}>
            ⚡ Up to +{reward} XP
          </Text>

          {completed && (
            <Text style={styles.simulationBestScore}>
              🏆 Best {bestScore}% • {attempts}{' '}
              {attempts === 1
                ? 'attempt'
                : 'attempts'}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.playButton,
            { backgroundColor: accent },
          ]}
        >
          <Text style={styles.playButtonText}>
            {completed ? 'Replay' : 'Play'}
          </Text>
          <Text style={styles.playArrow}>
            ›
          </Text>
        </View>
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

  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    marginBottom: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  segmentButton: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  segmentButtonActive: {
    backgroundColor: '#ECFDF5',
  },

  segmentIcon: {
    fontSize: 18,
  },

  segmentTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
  },

  segmentTitleActive: {
    color: '#047857',
  },

  segmentSub: {
    marginTop: 1,
    fontSize: 8,
    color: '#94A3B8',
  },

  learningFlowCard: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  flowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  learningFlowTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  flowSubtitle: {
    marginTop: 2,
    fontSize: 8,
    color: '#6B7280',
  },

  learningPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },

  learningPillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.4,
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

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: '#6B7280',
  },

  newPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },

  newPillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#92400E',
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

  cardPressed: {
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

  simulationHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
  },

  simulationHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  simulationHeroEmoji: {
    fontSize: 27,
  },

  simulationHeroText: {
    flex: 1,
  },

  simulationHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  simulationHeroTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065F46',
  },

  practicePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },

  practicePillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#047857',
  },

  simulationHeroDescription: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 13,
    color: '#4B5563',
  },

  simulationFlowCard: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  simulationFlowTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  simulationFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  simulationFlowStep: {
    flex: 1,
    alignItems: 'center',
  },

  simulationFlowEmoji: {
    fontSize: 19,
  },

  simulationFlowStepTitle: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '900',
    color: '#374151',
  },

  simulationFlowStepSub: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 7,
    lineHeight: 10,
    color: '#94A3B8',
  },

  simulationFlowArrow: {
    marginTop: -9,
    fontSize: 18,
    color: '#CBD5E1',
  },

  simulationList: {
    gap: 11,
  },

  simulationCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  simulationCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  simulationIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  simulationIcon: {
    fontSize: 25,
  },

  simulationTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  simulationCompletedPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },

  simulationCompletedText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#15803D',
  },

  simulationDifficultyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },

  simulationDifficultyText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#64748B',
  },

  simulationTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  simulationDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
  },

  simulationDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },

  simulationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  simulationStats: {
    flex: 1,
    gap: 3,
  },

  simulationMeta: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },

  simulationBestScore: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '900',
    color: '#334155',
  },

  playButton: {
    minWidth: 74,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  playButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  playArrow: {
    marginTop: -1,
    fontSize: 17,
    color: '#FFFFFF',
  },
});
