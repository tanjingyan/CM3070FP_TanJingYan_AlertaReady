import { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Stack,
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  doc,
  runTransaction,
} from 'firebase/firestore';

import { auth, db } from '../firebase/firebaseConfig';

import {
  getAdditionalSimulationXp,
  getEligibleSimulationXp,
  getLevelFromXp,
  getSimulationScore,
} from '../utils/progressLogic';

type Choice = {
  id: 'a' | 'b';
  icon: string;
  title: string;
  detail: string;
};

type SimulationStage = {
  id: string;
  sceneTitle: string;
  sceneText: string;
  sceneCaption: string;
  choices: [Choice, Choice];
  correctChoiceId: 'a' | 'b';
  saferFeedback: string;
  riskyFeedback: string;
};

type SimulationScenario = {
  id: 'earthquake' | 'wildfire' | 'flood';
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  accentDark: string;
  soft: string;
  border: string;
  maxXp: number;
  sourceLabel: string;
  stages: SimulationStage[];
};

type SavedSimulationResult = {
  completed?: boolean;
  bestScore?: number;
  attempts?: number;
  lastScore?: number;
  xpAwarded?: number;
  updatedAt?: string;
};

const scenarios: Record<string, SimulationScenario> = {
  earthquake: {
    id: 'earthquake',
    icon: '🏚️',
    eyebrow: 'EARTHQUAKE TRAINING',
    title: 'Earthquake Escape',
    subtitle:
      'Practise three decisions for staying safer during and immediately after strong shaking.',
    accent: '#7C3AED',
    accentDark: '#5B21B6',
    soft: '#F5F3FF',
    border: '#DDD6FE',
    maxXp: 30,
    sourceLabel: 'Safety guidance: Ready.gov / FEMA',
    stages: [
      {
        id: 'eq-1',
        sceneTitle: 'The room starts shaking',
        sceneText:

          'You are indoors when strong shaking suddenly begins. Objects are falling from shelves.',

        sceneCaption:

          'Shaking is active. You need to protect yourself immediately.',

        choices: [

          {
            id: 'a',
            icon: '🛡️',
            title: 'Drop, Cover and Hold On',
            detail:
              'Get low, protect your head and neck, and hold on to sturdy cover.',
          },

          {
            id: 'b',
            icon: '🚪',
            title: 'Run outside immediately',
            detail:
              'Try to leave the building while the shaking is still happening.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:
          'Drop, Cover and Hold On reduces exposure to falling and flying objects. If you are indoors, stay inside until the shaking stops and it is safe to exit.',
        riskyFeedback:
          'Running outside during strong shaking can expose you to falling glass, debris and unstable building materials.',

      },

      {
        id: 'eq-2',
        sceneTitle: 'The shaking stops',
        sceneText:
          'The building appears damaged and you decide it is necessary to leave. You are several floors above ground.',
        sceneCaption:

          'The safest exit method matters after an earthquake.',

        choices: [
          {
            id: 'a',
            icon: '🪜',
            title: 'Use the stairs carefully',
            detail:
              'Check the route and move away from the damaged building after exiting.',
          },

          {
            id: 'b',
            icon: '🛗',
            title: 'Take the elevator',
            detail:

              'Use the elevator so you can leave the building faster.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:
          'Avoid elevators after an earthquake. If a damaged building must be evacuated, use a safe exit route and move away from the structure.',
        riskyFeedback:
          'Elevators may stop working or become unsafe after an earthquake, especially when power or building systems are damaged.',

      },

      {
        id: 'eq-3',
        sceneTitle: 'An aftershock begins',
        sceneText:
          'You are now outside when another period of shaking starts. Buildings and utility lines are nearby.',
        sceneCaption:

          'Aftershocks can create additional falling hazards.',

        choices: [
          {
            id: 'a',
            icon: '🌳',
            title: 'Move to a clear area',
            detail:

              'Stay away from buildings, trees, streetlights and utility lines.',

          },

          {
            id: 'b',
            icon: '🏢',
            title: 'Stand next to the building',
            detail:

              'Stay close to the wall so you are near the entrance.',

          },
        ],

        correctChoiceId: 'a',
        saferFeedback:
          'When outdoors during shaking, a clear area away from structures and overhead hazards reduces the risk from falling debris.',

        riskyFeedback:
          'Building exteriors, glass, signs and utility lines can become falling hazards during an aftershock.',

      },

    ],

  },

  wildfire: {
    id: 'wildfire',
    icon: '🔥',
    eyebrow: 'WILDFIRE TRAINING',
    title: 'Wildfire Evacuation',
    subtitle:

      'Practise three decisions for responding to a wildfire evacuation.',

    accent: '#DC2626',
    accentDark: '#991B1B',
    soft: '#FEF2F2',
    border: '#FECACA',
    maxXp: 30,
    sourceLabel: 'Safety guidance: Ready.gov / FEMA',
    stages: [

      {
        id: 'wf-1',
        sceneTitle: 'An evacuation order arrives',
        sceneText:

          'Smoke is visible in the distance and authorities tell your area to evacuate immediately.',

        sceneCaption:

          'Conditions can change quickly during a wildfire.',

        choices: [

          {
            id: 'a',
            icon: '🚗',
            title: 'Leave when instructed',
            detail:

              'Take essential supplies and use the recommended evacuation route.',

          },

          {
            id: 'b',
            icon: '🏠',
            title: 'Wait for the fire to get closer',
            detail:

              'Stay home so you can watch the situation first.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:

          'When authorities tell you to evacuate because of wildfire danger, leave immediately and follow current official instructions.',

        riskyFeedback:

          'Waiting can reduce the time available to evacuate and may leave you facing heavier smoke, road closures or rapidly changing fire conditions.',

      },

      {
        id: 'wf-2',
        sceneTitle: 'You are getting ready to leave',
        sceneText:

          'You have only a short time before departure. Your emergency kit and necessary medication are within reach.',

        sceneCaption:

          'Prioritise essential items without delaying evacuation.',

        choices: [

          {
            id: 'a',
            icon: '🎒',
            title: 'Take essential supplies',
            detail:

              'Bring your emergency kit, necessary medication and important items that are ready to go.',

          },

          {
            id: 'b',
            icon: '📦',
            title: 'Pack as many belongings as possible',
            detail:

              'Spend extra time collecting valuables from different rooms.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:

          'Prepared emergency supplies can be taken quickly. Evacuation should not be delayed to collect non-essential belongings.',

        riskyFeedback:

          'Spending extra time packing can delay evacuation during a fast-changing wildfire emergency.',

      },

      {

        id: 'wf-3',
        sceneTitle: 'A familiar road is closed',
        sceneText:

          'During evacuation, the route you normally use is blocked. Updated official directions identify another route.',

        sceneCaption:

          'Road conditions can change during an evacuation.',

        choices: [

          {
            id: 'a',
            icon: '🧭',
            title: 'Follow updated official directions',
            detail:

              'Use the advised alternate evacuation route.',

          },

          {
            id: 'b',
            icon: '🌫️',
            title: 'Take a shortcut through smoke',
            detail:

              'Use a smaller road because it looks faster.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:

          'Follow current emergency information and official evacuation directions because closures and fire conditions can change.',

        riskyFeedback:

          'An unverified shortcut may lead toward heavier smoke, fire activity or blocked roads.',

      },

    ],

  },

  flood: {
    id: 'flood',
    icon: '🌊',
    eyebrow: 'FLOOD TRAINING',
    title: 'Flash Flood Challenge',
    subtitle:

      'Practise three decisions for avoiding common flood hazards.',

    accent: '#0369A1',
    accentDark: '#075985',
    soft: '#F0F9FF',
    border: '#BAE6FD',
    maxXp: 30,

    sourceLabel: 'Safety guidance: Ready.gov / FEMA',
    stages: [

      {

        id: 'fl-1',
        sceneTitle: 'Water covers the road',
        sceneText:

          'Heavy rain has caused water to flow across the road ahead while you are driving.',

        sceneCaption:

          'The depth and strength of floodwater can be difficult to judge.',

        choices: [

          {
            id: 'a',
            icon: '↩️',
            title: 'Turn around',
            detail:

              'Find another route and avoid driving through floodwater.',

          },

          {
            id: 'b',
            icon: '🚙',
            title: 'Drive through slowly',
            detail:

              'Continue because the water does not look very deep.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:

          'Do not drive through floodwater. Turn around and use another route because water depth, road damage and current strength may not be visible.',

        riskyFeedback:

          'Vehicles can be swept away by moving water, and submerged roads may be damaged or deeper than they appear.',

      },

      {

        id: 'fl-2',
        sceneTitle: 'Water is rising near home',
        sceneText:

          'A flash-flood warning is active and water is rising around the lower part of your area.',

        sceneCaption:

          'You need to get away from the rising water.',

        choices: [

          {
            id: 'a',
            icon: '⬆️',
            title: 'Move to higher ground',
            detail:

              'Follow evacuation instructions or move to a safer higher level when appropriate.',

          },

          {
            id: 'b',
            icon: '⬇️',
            title: 'Go to the basement',
            detail:

              'Move downstairs so you can monitor where the water is entering.',

          },

        ],

        correctChoiceId: 'a',
        saferFeedback:

          'Move to higher ground or a safer higher level when floodwater is rising, and evacuate immediately if authorities tell you to do so.',

        riskyFeedback:

          'Basements and lower floors can become dangerous traps as water rises.',

      },

      {

        id: 'fl-3',
        sceneTitle: 'Electrical equipment is wet',
        sceneText:

          'Floodwater has entered part of the building. Electrical equipment and outlets in the affected area are wet.',

        sceneCaption:

          'Floodwater and electricity are a dangerous combination.',

        choices: [

          {

            id: 'a',
            icon: '⚠️',
            title: 'Keep away from the equipment',
            detail:

              'Avoid touching wet electrical equipment and wait for safe professional guidance.',

          },

          {
            id: 'b',
            icon: '🔌',
            title: 'Switch the equipment on',
            detail:

              'Test it quickly to see whether the electricity still works.',

          },

        ],

        correctChoiceId: 'a',

        saferFeedback:

          'Do not touch electrical equipment if it is wet or if you are standing in water.',

        riskyFeedback:

          'Wet elctrical equipment can create a serious shock or electrocution hazard.',

      },

    ],

  },

};

export default function SimulationScreen() {
  const { scenario } = useLocalSearchParams<{

    scenario?: string;

  }>();

  const selectedScenario =

    scenarios[String(scenario ?? 'earthquake')] ??

    scenarios.earthquake;

  const [stageIndex, setStageIndex] =

    useState(0);

  const [selectedChoiceId, setSelectedChoiceId] =

    useState<'a' | 'b' | null>(null);

  const [correctCount, setCorrectCount] =

    useState(0);

  const [finished, setFinished] =

    useState(false);

  const [savingResult, setSavingResult] =

    useState(false);

  const [xpEarnedThisAttempt, setXpEarnedThisAttempt] =

    useState(0);

  const [alreadyAwardedXp, setAlreadyAwardedXp] =

    useState(0);

  const currentStage =

    selectedScenario.stages[stageIndex];

  const currentChoiceCorrect =

    selectedChoiceId ===

    currentStage.correctChoiceId;

  const progress =

    ((stageIndex + 1) /

      selectedScenario.stages.length) *

    100;

  const finalPercent =

    getSimulationScore(

      correctCount,

      selectedScenario.stages.length

    );

  const scoreLabel = useMemo(() => {

    if (finalPercent === 100) {

      return 'Excellent preparedness';

    }

    if (finalPercent >= 67) {

      return 'Good preparedness';

    }

    return 'Keep practising';

  }, [finalPercent]);

  function choose(choiceId: 'a' | 'b') {

    if (selectedChoiceId) {

      return;

    }

    setSelectedChoiceId(choiceId);

    if (

      choiceId ===

      currentStage.correctChoiceId

    ) {

      setCorrectCount(

        previous => previous + 1

      );

    }

  }

  async function continueSimulation() {

    if (!selectedChoiceId) {

      return;

    }

    const isLastStage =

      stageIndex ===

      selectedScenario.stages.length - 1;

    if (!isLastStage) {

      setStageIndex(

        previous => previous + 1

      );

      setSelectedChoiceId(null);

      return;

    }

    const finalCorrectCount =

      correctCount;

    await saveSimulationResult(

      finalCorrectCount

    );

    setFinished(true);

  }

  async function saveSimulationResult(

    safeDecisions: number

  ) {

    const user = auth.currentUser;

    if (!user) {

      return;

    }

    const scorePercent =
      getSimulationScore(
        safeDecisions,
        selectedScenario.stages.length
      );

    const eligibleXp =
      getEligibleSimulationXp(
        safeDecisions
      );

    setSavingResult(true);
    try {
      const result =
        await runTransaction(
          db,
          async transaction => {

            const userRef =
              doc(
                db,
                'users',
                user.uid
              );

            const snapshot =
              await transaction.get(
                userRef
              );

            const data =
              snapshot.exists()
                ? snapshot.data()
                : {};

            const savedSimulations =
              (
                data.simulations &&
                typeof data.simulations ===
                  'object'
              )
                ? data.simulations
                : {};

            const existing =

              (

                savedSimulations[

                  selectedScenario.id

                ] &&

                typeof savedSimulations[

                  selectedScenario.id

                ] === 'object'

              )

                ? savedSimulations[

                    selectedScenario.id

                  ] as SavedSimulationResult

                : {};

            const previousXpAwarded =
              Number(
                existing.xpAwarded ?? 0
              );

            const additionalXp =
              getAdditionalSimulationXp(
                eligibleXp,
                previousXpAwarded
              );

            const currentXp =
              Number(data.xp ?? 0);

            const nextXp =
              currentXp +
              additionalXp;

            const updatedResult = {
              completed: true,
              bestScore: Math.max(
                Number(
                  existing.bestScore ?? 0
                ),

                scorePercent
              ),

              lastScore:
                scorePercent,

              attempts:
                Number(
                  existing.attempts ?? 0
                ) + 1,

              xpAwarded: Math.max(
                previousXpAwarded,
                eligibleXp
              ),

              updatedAt:
                new Date().toISOString(),
            };

            transaction.set(
              userRef,
              {
                xp: nextXp,
                level:
                  getLevelFromXp(
                    nextXp
                  ),

                simulations: {
                  ...savedSimulations,
                  [selectedScenario.id]:
                    updatedResult,
                },

              },

              {
                merge: true,
              }

            );

            return {
              additionalXp,
              previousXpAwarded,
            };

          }

        );

      setXpEarnedThisAttempt(
        result.additionalXp

      );

      setAlreadyAwardedXp(

        result.previousXpAwarded

      );

    } catch (error) {

      console.warn(

        'Simulation result save error:',

        error

      );

      Alert.alert(

        'Result not saved',

        'Your simulation is complete, but Alerta Ready could not save the XP result. Check your connection and try again later.'

      );

    } finally {

      setSavingResult(false);

    }

  }

  function restartSimulation() {

    setStageIndex(0);

    setSelectedChoiceId(null);

    setCorrectCount(0);

    setFinished(false);

    setXpEarnedThisAttempt(0);

    setAlreadyAwardedXp(0);

  }

  if (finished) {

    return (

      <SafeAreaView

        style={styles.safeArea}

      >

        <Stack.Screen

          options={{

            headerShown: false,

          }}

        />

        <ScrollView

          contentContainerStyle={

            styles.resultContent

          }

          showsVerticalScrollIndicator={

            false

          }

        >

          <Pressable

            style={styles.backButton}

            onPress={() => router.back()}

          >

            <Text style={styles.backArrow}>

              ←

            </Text>

            <Text style={styles.backText}>

              Simulations

            </Text>

          </Pressable>

          <View

            style={[

              styles.resultHero,

              {

                backgroundColor:

                  selectedScenario.soft,

                borderColor:

                  selectedScenario.border,

              },

            ]}

          >

            <Text

              style={

                styles.resultScenarioIcon

              }

            >

              {selectedScenario.icon}

            </Text>

            <View

              style={styles.resultBadge}

            >

              <Text

                style={

                  styles.resultBadgeText

                }

              >

                SIMULATION COMPLETE

              </Text>

            </View>

            <Text

              style={styles.resultTitle}

            >

              {scoreLabel}

            </Text>

            <Text

              style={[

                styles.resultScore,

                {

                  color:

                    selectedScenario.accent,

                },

              ]}

            >

              {finalPercent}%

            </Text>

            <Text

              style={

                styles.resultScoreSub

              }

            >

              {correctCount} of{' '}

              {

                selectedScenario.stages

                  .length

              }{' '}

              safer decisions

            </Text>

          </View>

          <View

            style={styles.resultStatsCard}

          >

            <View

              style={styles.resultStat}

            >

              <Text

                style={

                  styles.resultStatIcon

                }

              >

                🛡️

              </Text>

              <Text

                style={

                  styles.resultStatValue

                }

              >

                {correctCount}/

                {

                  selectedScenario.stages

                    .length

                }

              </Text>

              <Text

                style={

                  styles.resultStatLabel

                }

              >

                Safe decisions

              </Text>

            </View>

            <View

              style={

                styles.resultStatDivider

              }

            />

            <View

              style={styles.resultStat}

            >

              <Text

                style={

                  styles.resultStatIcon

                }

              >

                ⚡

              </Text>

              <Text

                style={

                  styles.resultStatValue

                }

              >

                +{xpEarnedThisAttempt}

              </Text>

              <Text

                style={

                  styles.resultStatLabel

                }

              >

                XP earned now

              </Text>

            </View>

          </View>

          <View

            style={

              styles.resultExplanationCard

            }

          >

            <Text

              style={

                styles.resultExplanationTitle

              }

            >

              How XP works

            </Text>

            <Text

              style={

                styles.resultExplanationText

              }

            >

              Each safer decision is worth

              up to 10 XP. You can replay

              this simulation to improve

              your score and earn any

              remaining XP, up to{' '}

              {selectedScenario.maxXp} XP

              total for this scenario.

            </Text>

            {alreadyAwardedXp > 0 &&

              xpEarnedThisAttempt ===

                0 && (

                <View

                  style={

                    styles.replayNotice

                  }

                >

                  <Text

                    style={

                      styles.replayNoticeText

                    }

                  >

                    ✓ Your previous best

                    already earned the

                    available XP for this

                    score.

                  </Text>

                </View>

              )}

          </View>

          <View style={styles.resultActions}>

            <Pressable

              style={

                styles.secondaryAction

              }

              onPress={

                restartSimulation

              }

            >

              <Text

                style={

                  styles.secondaryActionText

                }

              >

                ↻ Try Again

              </Text>

            </Pressable>

            <Pressable

              style={[

                styles.primaryAction,

                {

                  backgroundColor:

                    selectedScenario.accent,

                },

              ]}

              onPress={() =>

                router.back()

              }

            >

              <Text

                style={

                  styles.primaryActionText

                }

              >

                Finish

              </Text>

            </Pressable>

          </View>

          <Text style={styles.sourceFooter}>

            {selectedScenario.sourceLabel}

          </Text>

        </ScrollView>

      </SafeAreaView>

    );

  }

  return (

    <SafeAreaView style={styles.safeArea}>

      <Stack.Screen

        options={{

          headerShown: false,

        }}

      />

      <ScrollView

        contentContainerStyle={

          styles.content

        }

        showsVerticalScrollIndicator={

          false

        }

      >

        <View style={styles.topRow}>

          <Pressable

            style={styles.backButton}

            onPress={() => router.back()}

          >

            <Text style={styles.backArrow}>

              ←

            </Text>

            <Text style={styles.backText}>

              Simulations

            </Text>

          </Pressable>

          <View

            style={[

              styles.xpPill,

              {

                backgroundColor:

                  selectedScenario.soft,

                borderColor:

                  selectedScenario.border,

              },

            ]}

          >

            <Text

              style={[

                styles.xpPillText,

                {

                  color:

                    selectedScenario

                      .accentDark,

                },

              ]}

            >

              ⚡ Up to +

              {selectedScenario.maxXp} XP

            </Text>

          </View>

        </View>

        <Text

          style={[

            styles.eyebrow,

            {

              color:

                selectedScenario.accent,

            },

          ]}

        >

          {selectedScenario.eyebrow}

        </Text>

        <Text style={styles.title}>

          {selectedScenario.title}

        </Text>

        <Text style={styles.subtitle}>

          {selectedScenario.subtitle}

        </Text>

        <View

          style={styles.progressHeader}

        >

          <Text

            style={styles.progressLabel}

          >

            Decision {stageIndex + 1} of{' '}

            {

              selectedScenario.stages

                .length

            }

          </Text>

          <Text

            style={styles.scoreText}

          >

            🛡️ {correctCount} safe

          </Text>

        </View>

        <View

          style={styles.progressTrack}

        >

          <View

            style={[

              styles.progressFill,

              {

                width: `${progress}%`,

                backgroundColor:

                  selectedScenario.accent,

              },

            ]}

          />

        </View>

        <SimulationScene

          scenario={

            selectedScenario.id

          }

          stageIndex={stageIndex}

          accent={

            selectedScenario.accent

          }

          soft={selectedScenario.soft}

          border={

            selectedScenario.border

          }

          title={

            currentStage.sceneTitle

          }

          caption={

            currentStage.sceneCaption

          }

        />

        <View

          style={styles.situationCard}

        >

          <Text

            style={

              styles.situationLabel

            }

          >

            SITUATION

          </Text>

          <Text

            style={

              styles.situationText

            }

          >

            {currentStage.sceneText}

          </Text>

        </View>

        <Text style={styles.question}>

          What would you do?

        </Text>

        <View style={styles.choiceList}>

          {currentStage.choices.map(

            choice => {

              const isSelected =

                selectedChoiceId ===

                choice.id;

              const isCorrect =

                choice.id ===

                currentStage

                  .correctChoiceId;

              const answered =

                selectedChoiceId !==

                null;

              return (

                <Pressable

                  key={choice.id}

                  disabled={answered}

                  onPress={() =>

                    choose(choice.id)

                  }

                  style={({ pressed }) => [

                    styles.choiceCard,

                    isSelected &&

                      isCorrect &&

                      styles.choiceCardSafe,

                    isSelected &&

                      !isCorrect &&

                      styles.choiceCardRisky,

                    answered &&

                      !isSelected &&

                      styles.choiceCardDimmed,

                    pressed &&

                      !answered &&

                      styles.choiceCardPressed,

                  ]}

                >

                  <View

                    style={

                      styles.choiceLetter

                    }

                  >

                    <Text

                      style={

                        styles.choiceLetterText

                      }

                    >

                      {choice.id.toUpperCase()}

                    </Text>

                  </View>

                  <View

                    style={

                      styles.choiceIconBox

                    }

                  >

                    <Text

                      style={

                        styles.choiceIcon

                      }

                    >

                      {choice.icon}

                    </Text>

                  </View>

                  <View

                    style={

                      styles.choiceContent

                    }

                  >

                    <Text

                      style={

                        styles.choiceTitle

                      }

                    >

                      {choice.title}

                    </Text>

                    <Text

                      style={

                        styles.choiceDetail

                      }

                    >

                      {choice.detail}

                    </Text>

                  </View>

                  {isSelected && (

                    <Text

                      style={[

                        styles.choiceResultIcon,

                        {

                          color: isCorrect

                            ? '#15803D'

                            : '#B91C1C',

                        },

                      ]}

                    >

                      {isCorrect

                        ? '✓'

                        : '!'}

                    </Text>

                  )}

                </Pressable>

              );

            }

          )}

        </View>

        {selectedChoiceId && (

          <View

            style={[

              styles.feedbackCard,

              currentChoiceCorrect

                ? styles.feedbackCardSafe

                : styles.feedbackCardRisky,

            ]}

          >

            <View

              style={

                styles.feedbackHeader

              }

            >

              <View

                style={[

                  styles.feedbackIconCircle,

                  currentChoiceCorrect

                    ? styles.feedbackIconCircleSafe

                    : styles.feedbackIconCircleRisky,

                ]}

              >

                <Text

                  style={

                    styles.feedbackIcon

                  }

                >

                  {currentChoiceCorrect

                    ? '✓'

                    : '!'}

                </Text>

              </View>

              <View style={{ flex: 1 }}>

                <Text

                  style={[

                    styles.feedbackTitle,

                    currentChoiceCorrect

                      ? styles.feedbackTitleSafe

                      : styles.feedbackTitleRisky,

                  ]}

                >

                  {currentChoiceCorrect

                    ? 'Safer decision'

                    : 'Riskier decision'}

                </Text>

                <Text

                  style={

                    styles.feedbackPoints

                  }

                >

                  {currentChoiceCorrect

                    ? '+10 preparedness XP available'

                    : '0 XP for this decision'}

                </Text>

              </View>

            </View>

            <Text

              style={

                styles.feedbackText

              }

            >

              {currentChoiceCorrect

                ? currentStage.saferFeedback

                : currentStage.riskyFeedback}

            </Text>

            <Pressable

              disabled={savingResult}

              onPress={

                continueSimulation

              }

              style={[

                styles.continueButton,

                {

                  backgroundColor:

                    selectedScenario.accent,

                },

                savingResult &&

                  styles.buttonDisabled,

              ]}

            >

              {savingResult ? (

                <ActivityIndicator

                  color="#FFFFFF"

                  size="small"

                />

              ) : (

                <>

                  <Text

                    style={

                      styles.continueButtonText

                    }

                  >

                    {stageIndex ===

                    selectedScenario

                      .stages.length -

                      1

                      ? 'View Results'

                      : 'Continue'}

                  </Text>

                  <Text

                    style={

                      styles.continueArrow

                    }

                  >

                    →

                  </Text>

                </>

              )}

            </Pressable>

          </View>

        )}

        <View

          style={styles.learningNote}

        >

          <Text

            style={

              styles.learningNoteIcon

            }

          >

            💡

          </Text>

          <Text

            style={

              styles.learningNoteText

            }

          >

            This is a preparedness

            training activity. During a

            real emergency, follow

            instructions from local

            authorities and emergency

            services.

          </Text>

        </View>

        <Text style={styles.sourceFooter}>

          {selectedScenario.sourceLabel}

        </Text>

      </ScrollView>

    </SafeAreaView>

  );

}

function SimulationScene({

  scenario,

  stageIndex,

  accent,

  soft,

  border,

  title,

  caption,

}: {

  scenario:

    | 'earthquake'

    | 'wildfire'

    | 'flood';

  stageIndex: number;

  accent: string;

  soft: string;

  border: string;

  title: string;

  caption: string;

}) {

  const scene =

    getSceneVisuals(

      scenario,

      stageIndex

    );

  return (

    <View

      style={[

        styles.sceneCard,

        {

          backgroundColor: soft,

          borderColor: border,

        },

      ]}

    >

      <View

        style={styles.sceneHeader}

      >

        <View style={{ flex: 1 }}>

          <Text

            style={styles.sceneTitle}

          >

            {title}

          </Text>

          <Text

            style={styles.sceneCaption}

          >

            {caption}

          </Text>

        </View>

        <View

          style={[

            styles.sceneStagePill,

            {

              backgroundColor:

                '#FFFFFF',

            },

          ]}

        >

          <Text

            style={[

              styles.sceneStageText,

              { color: accent },

            ]}

          >

            SCENE {stageIndex + 1}

          </Text>

        </View>

      </View>

      <View

        style={[

          styles.sceneCanvas,

          {

            backgroundColor:

              scene.sky,

          },

        ]}

      >

        <View

          style={[

            styles.sceneGround,

            {

              backgroundColor:

                scene.ground,

            },

          ]}

        />

        <Text

          style={[

            styles.sceneEmoji,

            styles.sceneEmojiLeft,

          ]}

        >

          {scene.left}

        </Text>

        <Text

          style={[

            styles.sceneEmoji,

            styles.sceneEmojiCenter,

          ]}

        >

          {scene.center}

        </Text>

        <Text

          style={[

            styles.sceneEmoji,

            styles.sceneEmojiRight,

          ]}

        >

          {scene.right}

        </Text>

        <Image

          source={require('../../assets/images/simulation-family.png')}

          style={styles.sceneCharacterImage}

          resizeMode="contain"

          accessibilityLabel="Family character in the disaster simulation scene"

        />

        <View

          style={

            styles.sceneStatusBubble

          }

        >

          <Text

            style={

              styles.sceneStatusText

            }

          >

            {scene.status}

          </Text>

        </View>

      </View>

    </View>

  );

}

function getSceneVisuals(

  scenario:

    | 'earthquake'

    | 'wildfire'

    | 'flood',

  stageIndex: number

) {

  if (scenario === 'earthquake') {

    const items = [

      {

        sky: '#EEF2FF',
        ground: '#E2E8F0',
        left: '🪟',
        center: '🛋️',
        right: '📚',
        status: '〰️ STRONG SHAKING',

      },

      {

        sky: '#F8FAFC',
        ground: '#E5E7EB',
        left: '🏢',
        center: '🪜',
        right: '🛗',
        status: '⚠️ BUILDING DAMAGE',

      },

      {

        sky: '#EFF6FF',
        ground: '#D1FAE5',
        left: '🏢',
        center: '🌳',
        right: '⚡',
        status: '〰️ AFTERSHOCK',

      },

    ];

    return items[stageIndex] ??

      items[0];

  }

  if (scenario === 'wildfire') {

    const items = [

      {

        sky: '#FFF7ED',
        ground: '#FEF3C7',
        left: '🏠',
        center: '🌲',
        right: '🔥',
        status: '🚨 EVACUATION ORDER',

      },

      {

        sky: '#FFF1F2',
        ground: '#FFEDD5',
        left: '🎒',
        center: '🏠',
        right: '🌫️',
        status: '⏱️ LEAVE SOON',

      },

      {

        sky: '#FFF7ED',
        ground: '#E5E7EB',
        left: '🚧',
        center: '🚗',
        right: '🌫️',
        status: '🧭 ROUTE CHANGED',

      },

    ];

    return items[stageIndex] ??

      items[0];

  }

  const items = [

    {

      sky: '#EFF6FF',
      ground: '#BAE6FD',
      left: '🚗',
      center: '🌊',
      right: '🛣️',
      status: '⚠️ FLOODED ROAD',

    },

    {

      sky: '#E0F2FE',
      ground: '#7DD3FC',
      left: '🏠',
      center: '🌊',
      right: '⬆️',
      status: '🚨 WATER RISING',

    },

    {

      sky: '#F0F9FF',
      ground: '#BAE6FD',
      left: '🔌',
      center: '🌊',
      right: '⚡',
      status: '⚠️ ELECTRICAL RISK',

    },

  ];

  return items[stageIndex] ??

    items[0];

}

const styles =

  StyleSheet.create({

    safeArea: {

      flex: 1,

      backgroundColor:

        '#F8FAFC',

    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 42,

    },

    resultContent: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 42,

    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:

        'space-between',

      gap: 10,
      marginBottom: 18,

    },

    backButton: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,

    },

    backArrow: {
      fontSize: 20,
      color: '#111827',
    },

    backText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#374151',
    },

    xpPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },

    xpPillText: {
      fontSize: 8,
      fontWeight: '900',
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    title: {
      marginTop: 5,
      fontSize: 25,
      fontWeight: '900',
      color: '#111827',
    },

    subtitle: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
      color: '#64748B',
    },

    progressHeader: {
      marginTop: 18,
      marginBottom: 7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:

        'space-between',

    },

    progressLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: '#475569',
    },

    scoreText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#475569',
    },

    progressTrack: {
      height: 7,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor:

        '#E2E8F0',

    },

    progressFill: {
      height: '100%',
      borderRadius: 999,
    },

    sceneCard: {
      marginTop: 14,
      padding: 12,
      borderRadius: 17,
      borderWidth: 1,
    },

    sceneHeader: {
      flexDirection: 'row',
      alignItems:

        'flex-start',

      gap: 10,
      marginBottom: 10,
    },

    sceneTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: '#111827',
    },

    sceneCaption: {
      marginTop: 3,
      fontSize: 8,
      lineHeight: 11,
      color: '#64748B',
    },

    sceneStagePill: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
    },

    sceneStageText: {
      fontSize: 7,
      fontWeight: '900',
    },

    sceneCanvas: {
      position: 'relative',
      height: 205,
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
      borderColor:

        'rgba(148, 163, 184, 0.22)',

    },

    sceneGround: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 73,
    },

    sceneEmoji: {
      position: 'absolute',
      fontSize: 48,
      zIndex: 2,
    },

    sceneEmojiLeft: {
      left: 18,
      bottom: 42,
    },

    sceneEmojiCenter: {
      left: '50%',
      top: 22,
      fontSize: 50,
      transform: [{ translateX: -25 }],
    },

    sceneEmojiRight: {
      right: 18,
      bottom: 42,
    },

    sceneCharacterImage: {
      position: 'absolute',
      left: '50%',
      bottom: -2,
      width: 132,
      height: 148,
      transform: [{ translateX: -66 }],
      zIndex: 4,
    },

    sceneStatusBubble: {
      position: 'absolute',
      right: 10,
      top: 10,
      maxWidth: 150,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor:

        'rgba(15, 23, 42, 0.82)',

    },

    sceneStatusText: {
      fontSize: 7,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    situationCard: {
      marginTop: 12,
      padding: 13,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor:

        '#FFFFFF',

    },

    situationLabel: {
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.6,
      color: '#64748B',
    },

    situationText: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      color: '#1F2937',
    },

    question: {
      marginTop: 18,
      marginBottom: 9,
      fontSize: 15,
      fontWeight: '900',
      color: '#111827',
    },

    choiceList: {
      gap: 9,
    },

    choiceCard: {
      minHeight: 82,
      padding: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',

      backgroundColor:

        '#FFFFFF',

      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,

    },

    choiceCardSafe: {
      borderColor: '#86EFAC',
      backgroundColor:

        '#F0FDF4',

    },

    choiceCardRisky: {
      borderColor: '#FCA5A5',
      backgroundColor:

        '#FEF2F2',
    },

    choiceCardDimmed: {
      opacity: 0.53,
    },

    choiceCardPressed: {
      opacity: 0.78,
    },

    choiceLetter: {
      width: 25,
      height: 25,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent:

        'center',

      backgroundColor:

        '#F1F5F9',

    },

    choiceLetterText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#475569',
    },

    choiceIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:

        'center',

      backgroundColor:

        '#F8FAFC',

    },

    choiceIcon: {
      fontSize: 21,
    },

    choiceContent: {
      flex: 1,
      minWidth: 0,
    },

    choiceTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#111827',
    },

    choiceDetail: {
      marginTop: 3,
      fontSize: 8,
      lineHeight: 12,
      color: '#64748B',
    },

    choiceResultIcon: {
      width: 22,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '900',
    },

    feedbackCard: {
      marginTop: 12,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
    },

    feedbackCardSafe: {
      borderColor: '#BBF7D0',
      backgroundColor:

        '#F0FDF4',

    },

    feedbackCardRisky: {
      borderColor: '#FECACA',
      backgroundColor:

        '#FEF2F2',

    },

    feedbackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    feedbackIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent:

        'center',

    },

    feedbackIconCircleSafe: {
      backgroundColor:

        '#DCFCE7',

    },

    feedbackIconCircleRisky: {
      backgroundColor:

        '#FEE2E2',

    },

    feedbackIcon: {
      fontSize: 17,
      fontWeight: '900',
      color: '#111827',

    },

    feedbackTitle: {
      fontSize: 11,
      fontWeight: '900',
    },

    feedbackTitleSafe: {
      color: '#166534',
    },

    feedbackTitleRisky: {
      color: '#991B1B',
    },

    feedbackPoints: {
      marginTop: 2,
      fontSize: 8,
      color: '#64748B',
    },

    feedbackText: {
      marginTop: 10,
      fontSize: 9,
      lineHeight: 14,
      color: '#475569',
    },

    continueButton: {
      minHeight: 42,
      marginTop: 12,
      paddingHorizontal: 15,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:

        'center',

      gap: 8,
    },

    continueButtonText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    continueArrow: {
      marginTop: -1,
      fontSize: 16,
      color: '#FFFFFF',
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    learningNote: {
      marginTop: 16,
      padding: 11,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems:

        'flex-start',

      gap: 8,
      backgroundColor:

        '#FFFBEB',

      borderWidth: 1,
      borderColor: '#FDE68A',

    },

    learningNoteIcon: {
      fontSize: 14,
    },

    learningNoteText: {
      flex: 1,
      fontSize: 8,
      lineHeight: 12,
      color: '#78350F',
    },

    sourceFooter: {
      marginTop: 12,
      textAlign: 'center',
      fontSize: 7,
      color: '#94A3B8',
    },

    resultHero: {
      marginTop: 16,
      padding: 22,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
    },

    resultScenarioIcon: {
      fontSize: 46,
    },

    resultBadge: {
      marginTop: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor:

        '#FFFFFF',

    },

    resultBadgeText: {
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.6,
      color: '#475569',
    },

    resultTitle: {
      marginTop: 13,
      fontSize: 18,
      fontWeight: '900',
      color: '#111827',
    },

    resultScore: {
      marginTop: 5,
      fontSize: 44,
      fontWeight: '900',
    },

    resultScoreSub: {
      marginTop: 2,
      fontSize: 10,
      color: '#64748B',
    },

    resultStatsCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#E2E8F0',

      backgroundColor:

        '#FFFFFF',

      flexDirection: 'row',
      alignItems: 'center',
    },

    resultStat: {
      flex: 1,
      alignItems: 'center',
    },

    resultStatDivider: {
      width: 1,
      height: 52,
      backgroundColor:

        '#E2E8F0',

    },

    resultStatIcon: {
      fontSize: 18,
    },

    resultStatValue: {
      marginTop: 4,
      fontSize: 17,
      fontWeight: '900',
      color: '#111827',
    },

    resultStatLabel: {
      marginTop: 2,
      fontSize: 8,
      color: '#64748B',
    },

    resultExplanationCard: {
      marginTop: 12,
      padding: 14,
      borderRadius: 15,
      backgroundColor:

        '#FFFFFF',

      borderWidth: 1,
      borderColor: '#E2E8F0',
    },

    resultExplanationTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#111827',
    },

    resultExplanationText: {
      marginTop: 5,
      fontSize: 9,
      lineHeight: 14,
      color: '#64748B',
    },

    replayNotice: {
      marginTop: 10,
      padding: 9,
      borderRadius: 10,
      backgroundColor:

        '#F0FDF4',

    },

    replayNoticeText: {
      fontSize: 8,
      lineHeight: 12,
      color: '#166534',
    },

    resultActions: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 9,
    },

    secondaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor:

        '#FFFFFF',

      alignItems: 'center',
      justifyContent:

        'center',

    },

    secondaryActionText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#475569',
    },

    primaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:

        'center',

    },

    primaryActionText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
    },

  });
