import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();

        if (user) {
          router.replace('/(tabs)/dashboard' as any);
        } else {
          router.replace('/auth' as any);
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logo}>🛡️</Text>
      </View>

      <Text style={styles.title}>AlertaReady</Text>

      <Text style={styles.subtitle}>
        Stay prepared. Stay safe.
      </Text>

      <Text style={styles.loadingText}>
        Loading...
      </Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  logo: {
    fontSize: 42,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#9A8FB8',
    marginBottom: 80,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 12,
  },

  progressBar: {
    width: 200,
    height: 12,
    borderRadius: 20,
    backgroundColor: '#EAEAEA',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#A855F7',
  },
});