import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserProgress } from '../hooks/use-UserProgress';

const taskData: any = {
  emergencyKit: {
    title: 'Build Emergency Kit',
    reward: 50,
    description: 'Prepare essential supplies that can support you during an emergency.',
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
        question: 'Which item is useful during a power outage?',
        options: ['Bluetooth speaker', 'Flashlight', 'Gaming controller'],
        answer: 'Flashlight',
      },
      {
        question: 'Why should you keep a first aid kit?',
        options: ['For minor injuries', 'For decoration', 'For charging phone'],
        answer: 'For minor injuries',
      },
      {
        question: 'What should emergency food be?',
        options: ['Non-perishable', 'Frozen only', 'Unpacked food'],
        answer: 'Non-perishable',
      },
    ],
  },
};

export default function TaskDetailsScreen() {
  const { taskId } = useLocalSearchParams();
  const { userData, completeTask } = useUserProgress();

  const task = taskData[taskId as string] || taskData.emergencyKit;

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);

  const isCompleted = userData.completedTasks.includes(task.title);

  const checklistDone =
    isCompleted || checkedItems.length === task.checklist.length;

  const quizAnswered =
    selectedAnswers.filter(Boolean).length === task.quiz.length;

  const correctAnswers = task.quiz.filter(
    (q: any, index: number) => selectedAnswers[index] === q.answer
  ).length;

  const quizPassed = quizAnswered && correctAnswers === task.quiz.length;

  function toggleChecklistItem(item: string) {
    if (isCompleted) return;

    if (checkedItems.includes(item)) {
      setCheckedItems(checkedItems.filter((i) => i !== item));
    } else {
      setCheckedItems([...checkedItems, item]);
    }
  }

  function selectAnswer(questionIndex: number, answer: string) {
    if (!checklistDone || isCompleted) return;

    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[questionIndex] = answer;
    setSelectedAnswers(updatedAnswers);
  }

  async function handleClaimXp() {
    if (isCompleted) return;

    if (!checklistDone) {
      Alert.alert('Checklist incomplete', 'Complete all checklist items first.');
      return;
    }

    if (!quizPassed) {
      Alert.alert('Quiz not passed', 'Answer all quiz questions correctly to claim XP.');
      return;
    }

    await completeTask(task.title, task.reward);
    Alert.alert('Task Completed!', `You earned +${task.reward} XP.`);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.reward}>Reward: +{task.reward} XP</Text>

          <Text style={styles.description}>{task.description}</Text>

          <Text style={styles.sectionTitle}>Checklist</Text>

          {task.checklist.map((item: string) => (
            <Pressable
              key={item}
              style={styles.checkRow}
              onPress={() => toggleChecklistItem(item)}
            >
              <Text style={styles.checkBox}>
                {checkedItems.includes(item) || isCompleted ? '✅' : '○'}
              </Text>
              <Text style={styles.checkText}>{item}</Text>
            </Pressable>
          ))}

          <Text style={styles.progressText}>
            Checklist Progress: {isCompleted ? task.checklist.length : checkedItems.length} / {task.checklist.length}
          </Text>

          {!checklistDone ? (
            <View style={styles.lockedQuiz}>
              <Text style={styles.lockedTitle}>Quiz Locked 🔒</Text>
              <Text style={styles.lockedText}>
                Complete all checklist items to unlock the quiz.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Quiz</Text>

              <Text style={styles.quizScore}>
                Quiz Score: {correctAnswers} / {task.quiz.length} correct
              </Text>

              {task.quiz.map((q: any, questionIndex: number) => (
                <View key={questionIndex} style={styles.questionBox}>
                  <Text style={styles.question}>
                    {questionIndex + 1}. {q.question}
                  </Text>

                  {q.options.map((option: string) => {
                    const selected = selectedAnswers[questionIndex] === option;
                    const hasAnswered = selectedAnswers[questionIndex] !== undefined;
                    const isCorrect = option === q.answer;
                    const isWrongSelected = selected && !isCorrect;

                    return (
                      <Pressable
                        key={option}
                        style={[
                          styles.option,
                          hasAnswered && isCorrect && styles.correctOption,
                          isWrongSelected && styles.wrongOption,
                        ]}
                        onPress={() => selectAnswer(questionIndex, option)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            ((hasAnswered && isCorrect) || isWrongSelected) &&
                              styles.selectedOptionText,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {selectedAnswers[questionIndex] !== undefined && (
                    <Text
                      style={[
                        styles.feedbackText,
                        selectedAnswers[questionIndex] === q.answer
                          ? styles.correctText
                          : styles.wrongText,
                      ]}
                    >
                      {selectedAnswers[questionIndex] === q.answer
                        ? 'Correct ✓'
                        : `Incorrect. Correct answer: ${q.answer}`}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          <Pressable
            style={[
              styles.button,
              (!checklistDone || !quizPassed || isCompleted) && styles.disabledButton,
            ]}
            onPress={handleClaimXp}
          >
            <Text style={styles.buttonText}>
              {isCompleted ? 'Completed ✓' : `Claim +${task.reward} XP`}
            </Text>
          </Pressable>

          {!isCompleted && (
            <Text style={styles.note}>
              Complete the checklist and answer all quiz questions correctly to claim XP.
            </Text>
          )}
        </View>
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
    padding: 18,
    paddingBottom: 100,
  },

  back: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },

  reward: {
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 14,
  },

  description: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 12,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  checkBox: {
    fontSize: 18,
    marginRight: 10,
  },

  checkText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },

  progressText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 14,
  },

  lockedQuiz: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 10,
  },

  lockedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },

  lockedText: {
    color: '#6B7280',
    fontSize: 13,
  },

  quizScore: {
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 12,
  },

  questionBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  question: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },

  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },

  correctOption: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  wrongOption: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },

  optionText: {
    color: '#374151',
    fontWeight: '600',
  },

  selectedOptionText: {
    color: '#FFFFFF',
  },

  feedbackText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },

  correctText: {
    color: '#10B981',
  },

  wrongText: {
    color: '#EF4444',
  },

  button: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },

  disabledButton: {
    backgroundColor: '#6B7280',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  note: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});