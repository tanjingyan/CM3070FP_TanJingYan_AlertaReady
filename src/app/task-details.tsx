import { useState } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { useUserProgress } from '../hooks/use-UserProgress';

const taskData: any = {
  emergencyKit: {
    number: 1,
    icon: '🎒',
    title: 'Build Emergency Kit',
    reward: 50,
    description:
      'Learn what belongs in an emergency kit, prepare the essentials, and test your knowledge.',

    learn: {
      intro:
        'An emergency kit should contain basic supplies that help you stay safe and independent if normal services are disrupted.',
      points: [
        'Store enough drinking water and non-perishable food.',
        'Keep lighting, charging and first-aid supplies ready.',
        'Include medication and simple signalling or warmth items.',
      ],
      tip:
        'Keep your kit somewhere easy to reach and review it regularly.',
    },

    checklist: [
      'Water and non-perishable food',
      'Flashlight and spare batteries',
      'First aid kit',
      'Power bank',
      'Important medication',
      'Whistle and emergency blanket',
    ],

    quiz: [
      {
        question:
          'Which item is useful during a power outage?',
        options: [
          'Bluetooth speaker',
          'Flashlight',
          'Gaming controller',
        ],
        answer: 'Flashlight',
        feedback: 'A flashlight gives reliable light during a power outage without depending on mains electricity.',
      },

      {
        question:
          'Why should you keep a first aid kit?',
        options: [
          'For minor injuries',
          'For decoration',
          'For charging phone',
        ],
        answer: 'For minor injuries',
        feedback: 'A first aid kit helps you treat minor injuries safely while further medical help is arranged if needed.',
      },

      {
        question:
          'What should emergency food be?',
        options: [
          'Non-perishable',
          'Frozen only',
          'Unpacked food',
        ],
        answer: 'Non-perishable',
        feedback: 'Non-perishable food can be stored for longer and does not rely on refrigeration during service disruptions.',
      },

    ],

  },
  familyPlan: {
    number: 2,
    icon: '👨‍👩‍👧',
    title: 'Family Emergency Plan',
    reward: 40,
    description:
      'Build a simple family plan for communication, meeting points and emergency contacts.',

    learn: {
      intro:
        'A family emergency plan helps everyone know what to do if you are separated or normal communication is disrupted.',

      points: [
        'Choose an emergency contact everyone knows.',
        'Agree on a nearby and an alternative meeting point.',
        'Make sure each family member knows important phone numbers.',
      ],

      tip:
        'Review the plan together so everyone understands their role.',
    },

    checklist: [
      'Choose an emergency contact',
      'Choose a family meeting point',
      'Save important phone numbers',
      'Discuss how to communicate',
      'Review the plan with family',
    ],

    quiz: [
      {
        question:
          'Why should a family choose a meeting point?',
        options: [
          'To reunite safely',
          'To store food',
          'To charge phones',
        ],
        answer: 'To reunite safely',
        feedback: 'A pre-agreed meeting point helps family members reunite safely if they become separated during an emergency.',
      },

      {
        question:
          'Who should know the emergency contact?',
        options: [
          'Everyone in the household',
          'Only one person',
          'Only neighbours',
        ],
        answer: 'Everyone in the household',
        feedback: 'Everyone should know the emergency contact so any household member can reach the same trusted person if communication is disrupted.',
      },

    ],

  },

  evacuationRoute: {
    number: 3,
    icon: '🏃',
    title: 'Know Your Evacuation Route',
    reward: 30,
    description:
      'Learn how to identify and practise a safer route away from danger.',
    learn: {
      intro:
        'Knowing where to go before an emergency can reduce confusion and delay when evacuation is needed.',
      points: [
        'Identify more than one possible exit route.',
        'Know a safe destination or meeting point.',
        'Avoid routes that may become blocked or hazardous.',
      ],
      tip:
        'Practise the route so you can follow it without relying on memory under stress.',
    },

    checklist: [
      'Identify your primary exit route',
      'Identify an alternative route',
      'Choose a safe meeting point',
      'Check for possible route hazards',
    ],

    quiz: [
      {
        question:
          'Why should you know an alternative evacuation route?',
        options: [
          'Your main route may be blocked',
          'It makes the trip longer',
          'It is only for tourists',
        ],
        answer:
          'Your main route may be blocked',
        feedback: 'An alternative route is important because the primary route may become blocked, unsafe or inaccessible during an emergency.',
      },

      {
        question:
          'When should you practise an evacuation route?',
        options: [
          'Before an emergency',
          'Only during an emergency',
          'Never',
        ],
        answer: 'Before an emergency',
        feedback: 'Practising before an emergency helps you remember the route and reduces confusion when evacuation is actually needed.',
      },

    ],

  },
  documents: {
    number: 4,
    icon: '📄',
    title: 'Secure Important Documents',
    reward: 20,
    description:
      'Prepare important personal records so they can be accessed after an emergency.',

    learn: {
      intro:
        'Important documents may be difficult to replace quickly after a disaster, so protected copies can support recovery.',
      points: [
        'Keep important identification and records together.',
        'Protect physical copies from water or damage.',
        'Consider keeping secure digital backups.',
      ],
      tip:
        'Review your stored documents regularly and update expired copies.',
    },

    checklist: [
      'Gather identification documents',
      'Gather insurance or financial records',
      'Protect physical copies',
      'Create secure digital backups',
    ],

    quiz: [
      {
        question:
          'Why keep digital backups of important documents?',
        options: [
          'For recovery if originals are damaged',
          'Only for decoration',
          'To make files larger',
        ],
        answer:
          'For recovery if originals are damaged',
        feedback: 'Secure digital backups can help you recover important information if physical originals are damaged or unavailable.',
      },

    ],

  },
  firstAid: {
    number: 5,
    icon: '⛑️',
    title: 'Learn Basic First Aid',
    reward: 20,
    description:
      'Review basic first-aid preparation and when to seek professional help.',
    learn: {
      intro:
        'Basic first-aid knowledge can help you provide immediate support while professional medical assistance is being arranged.',
      points: [
        'Know where your first-aid supplies are stored.',
        'Use clean materials for minor wounds.',
        'Seek professional help for serious injuries or emergencies.',
      ],
      tip:
        'A first-aid course provides more reliable practical training than reading alone.',
    },

    checklist: [
      'Locate your first aid kit',
      'Check basic supplies',
      'Review emergency contact numbers',
      'Know when to seek professional help',
    ],

    quiz: [
      {
        question:
          'What should you do for a serious injury?',
        options: [
          'Seek professional medical help',
          'Ignore it',
          'Only take a photo',
        ],
        answer:
          'Seek professional medical help',
        feedback: 'Serious injuries require professional medical assistance. Basic first aid should only provide immediate support while help is arranged.',
      },

    ],

  },

};

export default function TaskDetailsScreen() {

  const { taskId } =
    useLocalSearchParams();

  const {
    userData,
    completeTask,
  } = useUserProgress();

  const task =
    taskData[taskId as string] ||
    taskData.emergencyKit;

  const [learnCompleted, setLearnCompleted] =
    useState(false);

  const [checkedItems, setCheckedItems] =
    useState<string[]>([]);

  const [
    selectedAnswers,
    setSelectedAnswers,
  ] = useState<string[]>([]);

  const [
    selectedChecklistItem,
    setSelectedChecklistItem,
  ] = useState<string | null>(null);

  const [
    confirmationVisible,
    setConfirmationVisible,
  ] = useState(false);

  const [itemCooldown, setItemCooldown] =
    useState(false);
  // Alerta Ready quiz interaction:
  // one scenario question at a time with immediate feedback.

  const [currentChallengeIndex, setCurrentChallengeIndex] =
    useState(0);

  const isCompleted =
    userData.completedTasks.includes(
      task.title
    );

  const completedChecklistCount =
    isCompleted
      ? task.checklist.length
      : checkedItems.length;

  const checklistDone =
    isCompleted ||
    completedChecklistCount ===
      task.checklist.length;

  const quizAnswered =
    selectedAnswers.filter(Boolean)
      .length === task.quiz.length;

  const correctAnswers =
    task.quiz.filter(
      (q: any, index: number) =>
        selectedAnswers[index] ===
        q.answer
    ).length;

  const quizPassed =
    quizAnswered &&
    correctAnswers ===
      task.quiz.length;

  const currentSection =
    isCompleted
      ? 3
      : !learnCompleted
        ? 1
        : !checklistDone
          ? 2
          : 3;

  const completedSections =
    isCompleted
      ? 3
      : [
          learnCompleted,
          checklistDone,
          quizPassed,
        ].filter(Boolean).length;

  function continueToChecklist() {
    if (isCompleted) {
      return;
    }
    setLearnCompleted(true);
  }

  function openChecklistConfirmation(
    item: string
  ) {
    if (

      !learnCompleted ||
      isCompleted ||
      checkedItems.includes(item) ||
      itemCooldown
    ) {

      return;
    }

    setSelectedChecklistItem(item);
    setConfirmationVisible(true);
  }

  function closeChecklistConfirmation() {
    setConfirmationVisible(false);
    setSelectedChecklistItem(null);
  }

  function confirmChecklistItem() {

    if (
      !selectedChecklistItem ||
      isCompleted
    ) {
      return;
    }

    setCheckedItems((previous) => [
      ...previous,
      selectedChecklistItem,
    ]);

    closeChecklistConfirmation();
    setItemCooldown(true);

    setTimeout(() => {
      setItemCooldown(false);
    }, 700);

  }

  function selectAnswer(
    questionIndex: number,
    answer: string
  ) {

    if (
      !checklistDone ||
      selectedAnswers[questionIndex] !== undefined
    ) {
      return;
    }

    const updatedAnswers = [
      ...selectedAnswers,
    ];

    updatedAnswers[questionIndex] =
      answer;

    setSelectedAnswers(
      updatedAnswers
    );
  }

  function handleNextChallenge() {
    if (
      selectedAnswers[currentChallengeIndex] === undefined
    ) {
      return;
    }
    if (
      currentChallengeIndex <
      task.quiz.length - 1
    ) {
      setCurrentChallengeIndex(
        currentChallengeIndex + 1
      );
    }
  }

  function retryChallenge() {
    setSelectedAnswers([]);
    setCurrentChallengeIndex(0);
  }
  
  async function handleCompleteModule() {

    if (isCompleted) {
      return;
    }

    if (!learnCompleted) {
      Alert.alert(
        'Learning section incomplete',
        'Complete the Learn section first.'
      );
      return;
    }

    if (!checklistDone) {
      Alert.alert(
        'Checklist incomplete',
        'Complete all checklist items first.'
      );
      return;
    }

    if (!quizPassed) {
      Alert.alert(
        'Quiz not passed',
        'Complete the Quiz successfully to finish this module.'
      );
      return;
    }

    await completeTask(
      task.title,
      task.reward
    );

    Alert.alert(
      'Module Completed!',
      `You earned +${task.reward} XP.`
    );

    router.back();
  }

  const currentChallenge =
    task.quiz[currentChallengeIndex];
    
  const currentChallengeAnswer =
    selectedAnswers[currentChallengeIndex];

  const challengeAnswered =
    currentChallengeAnswer !== undefined;

  const challengeCorrect =
    challengeAnswered &&
    currentChallengeAnswer ===
      currentChallenge?.answer;

  const isLastChallenge =
    currentChallengeIndex ===
    task.quiz.length - 1;

  const challengeFinished =
    quizAnswered;

  const challengeProgress =
    task.quiz.length > 0
      ? ((currentChallengeIndex + 1) /
          task.quiz.length) *
        100
      : 0;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Back */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>
            ←
          </Text>
          <Text style={styles.backText}>
            Modules
          </Text>
        </Pressable>
        {/* Module header */}
        <View style={styles.moduleBadgeRow}>
          <View style={styles.moduleNumberBadge}>
            <Text style={styles.moduleNumberText}>
              MODULE {task.number}
            </Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>
              {isCompleted
                ? '✓ XP already earned'
                : `⚡ +${task.reward} XP`}
            </Text>
          </View>
        </View>
        <View style={styles.titleRow}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIcon}>
              {task.icon}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {task.title}
            </Text>
            <Text style={styles.description}>
              {task.description}
            </Text>
          </View>
        </View>
        {/* Section progress */}
        <View style={styles.moduleProgressCard}>
          <View style={styles.moduleProgressHeader}>
            <Text style={styles.moduleProgressTitle}>
              Module Progress
            </Text>
            <Text style={styles.moduleProgressCount}>
              {completedSections}/3 sections
            </Text>
          </View>
          <View style={styles.moduleStepsRow}>
            <ModuleStep
              number={1}
              label="Learn"
              state={
                isCompleted || learnCompleted
                  ? 'complete'
                  : currentSection === 1
                    ? 'active'
                    : 'locked'
              }
            />
            <View style={styles.stepLine} />
            <ModuleStep
              number={2}
              label="Checklist"
              state={
                isCompleted || checklistDone
                  ? 'complete'
                  : currentSection === 2
                    ? 'active'
                    : 'locked'
              }
            />
            <View style={styles.stepLine} />
            <ModuleStep
              number={3}
              label="Quiz"
              state={
                isCompleted || quizPassed
                  ? 'complete'
                  : currentSection === 3
                    ? 'active'
                    : 'locked'
              }
            />
          </View>
        </View>
        {/* SECTION 1: Learn */}
        <View
          style={[
            styles.sectionCard,
            currentSection === 1 &&
              styles.sectionCardActive,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>
                1
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Learn
              </Text>
              <Text style={styles.sectionSubtitle}>
                Understand the essentials first.
              </Text>
            </View>
            {(learnCompleted || isCompleted) && (
              <Text style={styles.sectionCompleteIcon}>
                ✓
              </Text>
            )}
          </View>
          <Text style={styles.learnIntro}>
            {task.learn.intro}
          </Text>
          <View style={styles.learningPointList}>
            {task.learn.points.map(
              (point: string) => (
                <View
                  key={point}
                  style={styles.learningPoint}
                >
                  <View style={styles.learningBullet}>
                    <Text style={styles.learningBulletText}>
                      ✓
                    </Text>
                  </View>
                  <Text style={styles.learningPointText}>
                    {point}
                  </Text>
                </View>
              )
            )}
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>
              KEY TIP
            </Text>
            <Text style={styles.tipText}>
              {task.learn.tip}
            </Text>
          </View>
          {!learnCompleted &&
            !isCompleted && (
              <Pressable
                style={styles.primaryButton}
                onPress={continueToChecklist}
              >
                <Text style={styles.primaryButtonText}>
                  Continue to Checklist
                </Text>
              </Pressable>
            )}
        </View>
        {/* SECTION 2: Checklist */}
        <View
          style={[
            styles.sectionCard,
            currentSection === 2 &&
              styles.sectionCardActive,
            !learnCompleted &&
              !isCompleted &&
              styles.sectionCardLocked,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>
                2
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Checklist
              </Text>
              <Text style={styles.sectionSubtitle}>
                Confirm your practical preparation.
              </Text>
            </View>
            {checklistDone ? (
              <Text style={styles.sectionCompleteIcon}>
                ✓
              </Text>
            ) : !learnCompleted ? (
              <Text style={styles.sectionLockIcon}>
                🔒
              </Text>
            ) : null}
          </View>
          {!learnCompleted &&
          !isCompleted ? (
            <LockedMessage
              text="Complete the Learn section to unlock the checklist."
            />
          ) : (
            <>
              <View style={styles.checklistProgressRow}>
                <View style={styles.checklistProgressBar}>
                  <View
                    style={[
                      styles.checklistProgressFill,
                      {
                        width: `${
                          (completedChecklistCount /
                            task.checklist.length) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.checklistProgressText}>
                  {completedChecklistCount}/
                  {task.checklist.length}
                </Text>
              </View>
              <View style={styles.checklistList}>
                {task.checklist.map(
                  (item: string) => {
                    const completed =
                      isCompleted ||
                      checkedItems.includes(
                        item
                      );
                    const disabled =
                      isCompleted ||
                      completed ||
                      itemCooldown;
                    return (
                      <Pressable
                        key={item}
                        disabled={disabled}
                        onPress={() =>
                          openChecklistConfirmation(
                            item
                          )
                        }
                        style={[
                          styles.checkRow,
                          completed &&
                            styles.checkRowCompleted,
                          itemCooldown &&
                            !completed &&
                            styles.checkRowCooldown,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkCircle,
                            completed &&
                              styles.checkCircleCompleted,
                          ]}
                        >
                          {completed && (
                            <Text style={styles.checkMark}>
                              ✓
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.checkText,
                            completed &&
                              styles.checkTextCompleted,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
              {itemCooldown &&
                !checklistDone && (
                  <Text style={styles.cooldownText}>
                    Next item unlocks in a moment...
                  </Text>
                )}
            </>
          )}
        </View>
        {/* SECTION 3: Quiz */}
        <View
          style={[
            styles.sectionCard,
            currentSection === 3 &&
              styles.sectionCardActive,
            !checklistDone &&
              styles.sectionCardLocked,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>
                3
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Quiz
              </Text>
              <Text style={styles.sectionSubtitle}>
                Apply what you learned to short emergency scenarios.
              </Text>
            </View>
            {(quizPassed || isCompleted) ? (
              <Text style={styles.sectionCompleteIcon}>
                ✓
              </Text>
            ) : !checklistDone ? (
              <Text style={styles.sectionLockIcon}>
                🔒
              </Text>
            ) : null}
          </View>
          {!checklistDone ? (
            <LockedMessage
              text="Complete the checklist to unlock the Quiz."
            />
          ) : challengeFinished ? (
            <View style={styles.challengeResultCard}>
              <View
                style={[
                  styles.challengeResultIconWrap,
                  quizPassed
                    ? styles.challengeResultIconSuccess
                    : styles.challengeResultIconRetry,
                ]}
              >
                <Text style={styles.challengeResultIcon}>
                  {quizPassed ? '✓' : '↻'}
                </Text>
              </View>
              <Text style={styles.challengeResultTitle}>
                {quizPassed
                  ? 'Quiz Complete'
                  : 'Review and Try Again'}
              </Text>
              <Text style={styles.challengeResultScore}>
                {correctAnswers} of {task.quiz.length} correct
              </Text>
              <Text style={styles.challengeResultText}>
                {quizPassed
                  ? 'You successfully applied the preparedness guidance from this module.'
                  : 'Some responses need another look. Review the feedback and retry the quiz.'}
              </Text>
              {isCompleted && (
                <Text style={styles.replayNoXpText}>
                  Replay mode • No additional XP is awarded
                </Text>
              )}
              {(isCompleted || !quizPassed) && (
                <Pressable
                  style={styles.retryChallengeButton}
                  onPress={retryChallenge}
                >
                  <Text style={styles.retryChallengeButtonText}>
                    {quizPassed
                      ? 'Replay Quiz'
                      : 'Retry Quiz'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.challengeCard}>
              <View style={styles.challengeTopRow}>
                <View style={styles.challengeLabelPill}>
                  <Text style={styles.challengeLabelText}>
                    QUIZ
                  </Text>
                </View>
                <Text style={styles.challengeCounter}>
                  {currentChallengeIndex + 1} / {task.quiz.length}
                </Text>
              </View>
              <View style={styles.challengeProgressTrack}>
                <View
                  style={[
                    styles.challengeProgressFill,
                    {
                      width: `${challengeProgress}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.scenarioCard}>
                <View style={styles.scenarioIconWrap}>
                  <Text style={styles.scenarioIcon}>
                    {task.icon}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scenarioLabel}>
                    SCENARIO
                  </Text>
                  <Text style={styles.scenarioQuestion}>
                    {currentChallenge.question}
                  </Text>
                </View>
              </View>
              <Text style={styles.chooseResponseText}>
                Choose your response
              </Text>
              <View style={styles.responseList}>
                {currentChallenge.options.map(
                  (
                    option: string,
                    optionIndex: number
                  ) => {
                    const selected =
                      currentChallengeAnswer ===
                      option;
                    const isCorrectOption =
                      option ===
                      currentChallenge.answer;
                    const optionIcon =
                      optionIndex === 0
                        ? 'A'
                        : optionIndex === 1
                          ? 'B'
                          : optionIndex === 2
                            ? 'C'
                            : 'D';
                    return (
                      <Pressable
                        key={option}
                        disabled={challengeAnswered}
                        onPress={() =>
                          selectAnswer(
                            currentChallengeIndex,
                            option
                          )
                        }
                        style={[
                          styles.responseOption,
                          challengeAnswered &&
                            isCorrectOption &&
                            styles.responseOptionCorrect,
                          challengeAnswered &&
                            selected &&
                            !isCorrectOption &&
                            styles.responseOptionWrong,
                          challengeAnswered &&
                            !selected &&
                            !isCorrectOption &&
                            styles.responseOptionDimmed,
                        ]}
                      >
                        <View
                          style={[
                            styles.responseLetter,
                            challengeAnswered &&
                              isCorrectOption &&
                              styles.responseLetterCorrect,
                            challengeAnswered &&
                              selected &&
                              !isCorrectOption &&
                              styles.responseLetterWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.responseLetterText,
                              challengeAnswered &&
                                (isCorrectOption ||
                                  (selected &&
                                    !isCorrectOption)) &&
                                styles.responseLetterTextSelected,
                            ]}
                          >
                            {optionIcon}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.responseText,
                            challengeAnswered &&
                              isCorrectOption &&
                              styles.responseTextCorrect,
                            challengeAnswered &&
                              selected &&
                              !isCorrectOption &&
                              styles.responseTextWrong,
                          ]}
                        >
                          {option}
                        </Text>
                        <Text style={styles.responseChevron}>
                          {challengeAnswered &&
                          isCorrectOption
                            ? '✓'
                            : challengeAnswered &&
                                selected &&
                                !isCorrectOption
                              ? '!'
                              : '›'}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
              {challengeAnswered && (
                <View
                  style={[
                    styles.feedbackPanel,
                    challengeCorrect
                      ? styles.feedbackPanelCorrect
                      : styles.feedbackPanelWrong,
                  ]}
                >
                  <View
                    style={[
                      styles.feedbackIconWrap,
                      challengeCorrect
                        ? styles.feedbackIconCorrect
                        : styles.feedbackIconWrong,
                    ]}
                  >
                    <Text style={styles.feedbackIconText}>
                      {challengeCorrect ? '✓' : '!'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedbackPanelTitle}>
                      {challengeCorrect
                        ? 'Good decision'
                        : 'Review this response'}
                    </Text>
                    <Text style={styles.feedbackPanelText}>
                      {challengeCorrect
                        ? currentChallenge.feedback
                        : `Recommended response: ${currentChallenge.answer}. ${currentChallenge.feedback}`}
                    </Text>
                  </View>
                </View>
              )}
              {challengeAnswered &&
                !isLastChallenge && (
                  <Pressable
                    style={styles.continueChallengeButton}
                    onPress={handleNextChallenge}
                  >
                    <Text style={styles.continueChallengeButtonText}>
                      Continue
                    </Text>
                    <Text style={styles.continueChallengeArrow}>
                      →
                    </Text>
                  </Pressable>
                )}
              {challengeAnswered &&
                isLastChallenge && (
                  <View style={styles.resultReadyCard}>
                    <Text style={styles.resultReadyText}>
                      Response recorded. Your quiz result is ready.
                    </Text>
                  </View>
                )}
            </View>
          )}
        </View>
        {/* Completion */}
        <Pressable
          disabled={
            !quizPassed || isCompleted
          }
          style={[
            styles.completeButton,
            (!quizPassed || isCompleted) &&
              styles.completeButtonDisabled,
          ]}
          onPress={handleCompleteModule}
        >
          <Text
            style={[
              styles.completeButtonText,
              (!quizPassed || isCompleted) &&
                styles.completeButtonTextDisabled,
            ]}
          >
            {isCompleted
              ? 'Module Completed ✓'
              : `Complete Module • +${task.reward} XP`}
          </Text>
        </Pressable>
        {!isCompleted && (
          <Text style={styles.completeHint}>
            Finish Learn, Checklist and Quiz to complete this module.
          </Text>
        )}
      </ScrollView>
      {/* Checklist confirmation */}
      <Modal
        visible={confirmationVisible}
        transparent
        animationType="slide"
        onRequestClose={
          closeChecklistConfirmation
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={
              closeChecklistConfirmation
            }
          />
          <View style={styles.confirmationSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetIconBox}>
              <Text style={styles.sheetIcon}>
                {task.icon}
              </Text>
            </View>
            <Text style={styles.sheetTitle}>
              {selectedChecklistItem}
            </Text>
            <Text style={styles.sheetSubtitle}>
              Confirm that you have completed this preparation step.
            </Text>
            <Pressable
              style={styles.confirmButton}
              onPress={confirmChecklistItem}
            >
              <Text style={styles.confirmButtonText}>
                Yes, completed
              </Text>
            </Pressable>
            <Pressable
              style={styles.notYetButton}
              onPress={
                closeChecklistConfirmation
              }
            >
              <Text style={styles.notYetButtonText}>
                Not yet
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function ModuleStep({
  number,
  label,
  state,
}: {
  number: number;
  label: string;
  state:
    | 'active'
    | 'complete'
    | 'locked';
}) {
  return (
    <View style={styles.moduleStep}>
      <View
        style={[
          styles.moduleStepCircle,
          state === 'active' &&
            styles.moduleStepCircleActive,
          state === 'complete' &&
            styles.moduleStepCircleComplete,
        ]}
      >
        <Text
          style={[
            styles.moduleStepNumber,
            (state === 'active' ||
              state === 'complete') &&
              styles.moduleStepNumberActive,
          ]}
        >
          {state === 'complete'
            ? '✓'
            : number}
        </Text>
      </View>
      <Text
        style={[
          styles.moduleStepLabel,
          state === 'active' &&
            styles.moduleStepLabelActive,
          state === 'complete' &&
            styles.moduleStepLabelComplete,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function LockedMessage({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.lockedMessage}>
      <Text style={styles.lockedMessageIcon}>
        🔒
      </Text>
      <Text style={styles.lockedMessageText}>
        {text}
      </Text>
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
    paddingTop: 10,
    paddingBottom: 100,
  },

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },

  backArrow: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  backText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  moduleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  moduleNumberBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },

  moduleNumberText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#6B7280',
  },

  rewardBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },

  rewardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400E',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 16,
  },

  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  headerIcon: {
    fontSize: 23,
  },

  title: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
  },

  description: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#6B7280',
  },

  moduleProgressCard: {
    padding: 13,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  moduleProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  moduleProgressTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },

  moduleProgressCount: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },

  moduleStepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  moduleStep: {
    width: 66,
    alignItems: 'center',
  },

  moduleStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },

  moduleStepCircleActive: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },

  moduleStepCircleComplete: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },

  moduleStepNumber: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9CA3AF',
  },

  moduleStepNumberActive: {
    color: '#FFFFFF',
  },

  moduleStepLabel: {
    marginTop: 5,
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
  },

  moduleStepLabelActive: {
    color: '#15803D',
  },

  moduleStepLabelComplete: {
    color: '#15803D',
  },

  stepLine: {
    flex: 1,
    height: 2,
    marginTop: 12,
    backgroundColor: '#E5E7EB',
  },

  sectionCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  sectionCardActive: {
    borderColor: '#86EFAC',
  },

  sectionCardLocked: {
    backgroundColor: '#FAFAFA',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  
  sectionNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  sectionNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSubtitle: {
    marginTop: 1,
    fontSize: 9,
    color: '#6B7280',
  },

  sectionCompleteIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A34A',
  },

  sectionLockIcon: {
    fontSize: 13,
  },

  learnIntro: {
    marginBottom: 12,
    fontSize: 11,
    lineHeight: 16,
    color: '#374151',
  },

  learningPointList: {
    gap: 9,
  },

  learningPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  learningBullet: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  learningBulletText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
  },

  learningPointText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: '#374151',
  },

  tipCard: {
    padding: 10,
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
  },

  tipLabel: {
    marginBottom: 3,
    fontSize: 8,
    fontWeight: '900',
    color: '#A16207',
  },

  tipText: {
    fontSize: 10,
    lineHeight: 14,
    color: '#713F12',
  },

  primaryButton: {
    minHeight: 42,
    marginTop: 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
  },

  primaryButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  lockedMessage: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },

  lockedMessageIcon: {
    fontSize: 18,
  },

  lockedMessageText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    color: '#6B7280',
  },

  checklistProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
  },

  checklistProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  checklistProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },

  checklistProgressText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#166534',
  },

  checklistList: {
    gap: 7,
  },

  checkRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },

  checkRowCompleted: {
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
  },

  checkRowCooldown: {
    opacity: 0.45,
  },

  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  checkCircleCompleted: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },

  checkMark: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  checkText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },

  checkTextCompleted: {
    color: '#166534',
    textDecorationLine: 'line-through',
  },

  cooldownText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
  },

  challengeCard: {
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE7E2',
    backgroundColor: '#FBFDFC',
  },

  challengeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  challengeLabelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8F7F0',
  },

  challengeLabelText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#087A4B',
  },

  challengeCounter: {
    fontSize: 9,
    fontWeight: '900',
    color: '#667085',
  },

  challengeProgressTrack: {
    height: 5,
    marginBottom: 13,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  challengeProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#079455',
  },

  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 13,
    borderRadius: 12,
    backgroundColor: '#0F2D26',
  },

  scenarioIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#164B3D',
  },

  scenarioIcon: {
    fontSize: 18,
  },
  
  scenarioLabel: {
    marginBottom: 4,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#9DE4C7',
  },

  scenarioQuestion: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  chooseResponseText: {
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },

  responseList: {
    gap: 8,
  },

  responseOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
  },

  responseOptionCorrect: {
    borderColor: '#7DCEA8',
    backgroundColor: '#ECFDF3',
  },

  responseOptionWrong: {
    borderColor: '#F0B2A9',
    backgroundColor: '#FFF4F2',
  },

  responseOptionDimmed: {
    opacity: 0.42,
  },

  responseLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F7',
  },

  responseLetterCorrect: {
    backgroundColor: '#079455',
  },

  responseLetterWrong: {
    backgroundColor: '#D92D20',
  },

  responseLetterText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#667085',
  },

  responseLetterTextSelected: {
    color: '#FFFFFF',
  },

  responseText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: '#344054',
  },

  responseTextCorrect: {
    color: '#05603A',
  },

  responseTextWrong: {
    color: '#912018',
  },

  responseChevron: {
    width: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    color: '#98A2B3',
  },

  feedbackPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
  },

  feedbackPanelCorrect: {
    backgroundColor: '#ECFDF3',
  },

  feedbackPanelWrong: {
    backgroundColor: '#FFF8E8',
  },

  feedbackIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackIconCorrect: {
    backgroundColor: '#079455',
  },

  feedbackIconWrong: {
    backgroundColor: '#F79009',
  },

  feedbackIconText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  feedbackPanelTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#101828',
  },

  feedbackPanelText: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: '#475467',
  },

  continueChallengeButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 11,
    borderRadius: 9,
    backgroundColor: '#079455',
  },
  
  continueChallengeButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  continueChallengeArrow: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  resultReadyCard: {
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#E8F7F0',
  },

  resultReadyText: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    color: '#087A4B',
  },

  challengeResultCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE7E2',
    backgroundColor: '#FBFDFC',
  },

  challengeResultIconWrap: {
    width: 54,
    height: 54,
    marginBottom: 10,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeResultIconSuccess: {
    backgroundColor: '#D1FADF',
  },

  challengeResultIconRetry: {
    backgroundColor: '#FEF0C7',
  },

  challengeResultIcon: {
    fontSize: 23,
    fontWeight: '900',
    color: '#079455',
  },

  challengeResultTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#101828',
  },

  challengeResultScore: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '900',
    color: '#087A4B',
  },

  challengeResultText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 14,
    color: '#667085',
  },

  replayNoXpText: {
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'center',
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
  },

  retryChallengeButton: {
    alignSelf: 'stretch',
    minHeight: 41,
    marginTop: 13,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F2D26',
  },

  retryChallengeButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  completeButton: {
    minHeight: 48,
    marginTop: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
  },

  completeButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },

  completeButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  
  completeButtonTextDisabled: {
    color: '#9CA3AF',
  },

  completeHint: {
    marginTop: 8,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 12,
    color: '#9CA3AF',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.38)',
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  confirmationSheet: {
    paddingHorizontal: 22,
    paddingTop: 11,
    paddingBottom: 26,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 18,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },

  sheetIconBox: {
    alignSelf: 'center',
    width: 54,
    height: 54,
    marginBottom: 13,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  sheetIcon: {
    fontSize: 24,
  },

  sheetTitle: {
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },

  sheetSubtitle: {
    marginTop: 5,
    marginBottom: 17,
    paddingHorizontal: 15,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 15,
    color: '#6B7280',
  },

  confirmButton: {
    minHeight: 43,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
  },

  confirmButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  notYetButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notYetButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  
});
