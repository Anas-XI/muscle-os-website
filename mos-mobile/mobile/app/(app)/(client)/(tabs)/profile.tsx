import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as api from '../../../../services/api';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { session } } = api.getSession();
    if (!session?.user) { setLoading(false); return; }
    const data = await api.fetchProfile(session.user.id);
    setProfile(data);
    setLoading(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Profile</Text></View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No profile yet.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/(onboarding)')}>
            <Text style={styles.buttonText}>Start Onboarding</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fields = [
    { label: 'Goal', value: profile.goal },
    { label: 'Situation', value: profile.situation },
    { label: 'Experience', value: profile.experience },
    { label: 'Weight', value: profile.weight ? `${profile.weight} kg` : null },
    { label: 'Height', value: profile.height ? `${profile.height} cm` : null },
    { label: 'Age', value: profile.age },
    { label: 'Training Days/Week', value: profile.training_days },
    { label: 'Session Length', value: profile.session_length ? `${profile.session_length} min` : null },
    { label: 'Sleep', value: profile.sleep },
    { label: 'Stress', value: profile.stress },
    { label: 'Injuries', value: profile.injuries?.length ? profile.injuries.join(', ') : 'None' },
    { label: 'Gut Health', value: profile.gut_health },
  ].filter(f => f.value);

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Profile</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.checkinButton} onPress={() => router.push('/(app)/(client)/checkin')}>
          <Text style={styles.checkinButtonText}>Weekly Check-in</Text>
        </TouchableOpacity>
        {fields.map((f, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <Text style={styles.value}>{f.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  header: { padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  checkinButton: { backgroundColor: '#1e3a5f', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center' },
  checkinButtonText: { color: '#60a5fa', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center' },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  field: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 },
  label: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  value: { color: '#fff', fontSize: 16 },
});
