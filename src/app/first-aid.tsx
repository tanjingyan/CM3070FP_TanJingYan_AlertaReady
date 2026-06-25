import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';

export default function FirstAidScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>🩹 First Aid Basics</Text>

        <Text style={styles.sectionTitle}>1. Check for danger</Text>
        <Text style={styles.description}>
          Ensure the area is safe before helping.
        </Text>

        <Text style={styles.sectionTitle}>
          2. Call emergency services (995)
        </Text>
        <Text style={styles.description}>
          Contact emergency responders immediately.
        </Text>

        <Text style={styles.sectionTitle}>3. Stop severe bleeding</Text>
        <Text style={styles.description}>
          Apply pressure to the wound.
        </Text>

        <Text style={styles.sectionTitle}>4. Perform CPR if trained</Text>
        <Text style={styles.description}>
          Provide CPR until help arrives.
        </Text>

        <Text style={styles.sectionTitle}>5. Keep the casualty calm</Text>
        <Text style={styles.description}>
          Reassure the injured person.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 20,
  },

  backButton: {
    marginBottom: 20,
  },

  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 6,
  },

  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
});