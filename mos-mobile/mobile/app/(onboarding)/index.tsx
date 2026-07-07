import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Muscle OS</Text>
      <Text style={styles.title}>Let's set up your profile</Text>
      <Text style={styles.subtitle}>
        We'll ask you 28 questions across 8 screens to build your personalized coaching program.
        It takes about 5 minutes.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/(onboarding)/step1')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 40, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
