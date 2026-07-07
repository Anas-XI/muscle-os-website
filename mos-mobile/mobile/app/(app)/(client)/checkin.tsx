import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as api from '../../../services/api';

const RATING_LABELS = ['Very Low', 'Low', 'Fair', 'Good', 'Excellent'];
const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee'];

interface Checkin {
  id: string; checkin_number: number; weight: number | null;
  sleep_hours: number | null; sleep_quality: number | null;
  readiness: number | null; adherence: number | null;
  soreness: number | null; notes: string; created_at: string;
}

export default function CheckinScreen() {
  const [weight, setWeight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [readiness, setReadiness] = useState(3);
  const [adherence, setAdherence] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [notes, setNotes] = useState('');
  const [checkinNumber, setCheckinNumber] = useState(1);
  const [history, setHistory] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCheckins();
  }, []);

  async function loadCheckins() {
    const { data: { session } } = api.getSession();
    if (!session?.user) { setLoading(false); return; }
    const list = await api.fetchCheckins(session.user.id, 10) as Checkin[];
    setHistory(list);
    setCheckinNumber(list.length > 0 ? list[0].checkin_number + 1 : 1);
    if (list.length > 0 && list[0].weight) setWeight(list[0].weight.toString());
    setLoading(false);
  }

  async function submitCheckin() {
    const { data: { session } } = api.getSession();
    if (!session?.user) { return; }
    setSaving(true);
    try {
      await api.addCheckin(session.user.id, {
        checkin_number: checkinNumber,
        weight: weight ? parseFloat(weight) : null,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        sleep_quality: sleepQuality,
        readiness, adherence, soreness,
        notes: notes.trim() || null,
      });
      Alert.alert('Check-in Complete!', `Week ${checkinNumber} logged.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  function RatingSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <View style={styles.ratingGroup}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} style={[styles.ratingDot, value === n && { backgroundColor: RATING_COLORS[n - 1], borderColor: RATING_COLORS[n - 1] }]} onPress={() => onChange(n)}>
              <Text style={[styles.ratingDotText, value === n && { color: '#fff' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.ratingDesc, { color: RATING_COLORS[value - 1] }]}>{RATING_LABELS[value - 1]}</Text>
      </View>
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>{'< Back'}</Text></TouchableOpacity>
        <Text style={styles.title}>Weekly Check-in #{checkinNumber}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="Current weight (kg)" placeholderTextColor="#555" keyboardType="numeric" />
        <TextInput style={styles.input} value={sleepHours} onChangeText={setSleepHours} placeholder="Avg sleep hours (e.g. 7.5)" placeholderTextColor="#555" keyboardType="numeric" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <RatingSelector label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} />
        <RatingSelector label="Readiness to Train" value={readiness} onChange={setReadiness} />
        <RatingSelector label="Program Adherence" value={adherence} onChange={setAdherence} />
        <RatingSelector label="Muscle Soreness" value={soreness} onChange={setSoreness} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="How was your week? Any issues, wins, or questions?" placeholderTextColor="#555" multiline />
      </View>

      <TouchableOpacity style={[styles.submitButton, saving && { opacity: 0.5 }]} onPress={submitCheckin} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Saving...' : 'Submit Check-in'}</Text>
      </TouchableOpacity>

      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Check-ins</Text>
          {history.slice(0, 4).map(c => (
            <View key={c.id} style={styles.historyCard}>
              <Text style={styles.historyTitle}>Week {c.checkin_number} — {c.created_at.slice(0, 10)}</Text>
              <Text style={styles.historyDetail}>
                Weight: {c.weight ? `${c.weight}kg` : '-'} | Sleep: {c.sleep_hours ? `${c.sleep_hours}h` : '-'} | Readiness: {c.readiness ?? '-'}/5
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', marginBottom: 16 },
  back: { color: '#3b82f6', fontSize: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  ratingGroup: { marginBottom: 16 },
  ratingLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '500', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  ratingDot: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  ratingDotText: { color: '#666', fontSize: 16, fontWeight: '700' },
  ratingDesc: { textAlign: 'center', fontSize: 13, marginTop: 4, fontWeight: '500' },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyCard: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 6 },
  historyTitle: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
  historyDetail: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
});
