import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import { useOnboardingStore } from '../../stores/onboarding-store';
import * as api from '../../services/api';

export default function Step8() {
  const { data, toProfilePayload, toEdScreening } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const fields = [
    { label: 'Goal', value: data.goal },
    { label: 'Situation', value: data.situation },
    { label: 'Experience', value: data.experience },
    { label: 'Weight', value: data.weight ? `${data.weight} kg` : null },
    { label: 'Height', value: data.height ? `${data.height} cm` : null },
    { label: 'Age', value: data.age },
    { label: 'Training days/week', value: data.training_days },
    { label: 'Session length', value: data.session_length ? `${data.session_length} min` : null },
    { label: 'Sleep', value: data.sleep },
    { label: 'Stress', value: data.stress },
    { label: 'Injuries', value: data.has_injuries ? data.injuries : 'None' },
    { label: 'Gut health', value: data.gut_health },
    { label: 'ED risk', value: toEdScreening() ? 'Flagged' : 'None detected' },
  ].filter(f => f.value);

  async function handleSubmit() {
    setSaving(true);
    try {
      const { data: { session } } = api.getSession();
      if (!session?.user) { Alert.alert('Error', 'Not signed in'); setSaving(false); return; }

      const payload = toProfilePayload();
      await api.updateProfile(session.user.id, { ...payload, completed: 1 });

      api.generateProgram(session.user.id).catch(() => {});

      useOnboardingStore.getState().reset();
      router.replace('/(app)/(client)/(tabs)/chat');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  return (
    <OnboardingLayout
      step={7} total={8}
      title="Review your profile"
      canNext={!saving}
      onNext={handleSubmit}
      onBack={() => router.back()}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {fields.map((f, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <Text style={styles.value}>{f.value}</Text>
          </View>
        ))}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#e2e8f0', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
