import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView, Dimensions } from 'react-native';
import * as api from '../../../../services/api';

type Tab = 'log' | 'history' | 'progress';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Pull Up', 'Lat Pulldown', 'Leg Press',
  'Dumbbell Curl', 'Tricep Pushdown', 'Lateral Raise', 'Face Pull',
];

interface WorkoutLog {
  id: string; exercise: string; sets: number; reps: number;
  weight: number; rpe: number | null; notes: string; logged_at: string;
}

export default function TrackerScreen() {
  const [tab, setTab] = useState<Tab>('log');
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [showExercises, setShowExercises] = useState(false);

  const [progressExercise, setProgressExercise] = useState('');
  const [progressData, setProgressData] = useState<{logged_at: string; weight: number; reps: number; sets: number}[]>([]);

  useEffect(() => {
    const { data: { session: s } } = api.getSession();
    setSession(s);
    if (s?.user) loadHistory(s.user.id);
  }, []);

  const loadHistory = useCallback(async (uid: string) => {
    const data = await api.fetchWorkouts(uid, 100);
    setLogs(data);
  }, []);

  async function logWorkout() {
    if (!exercise.trim() || !sets || !reps || !weight) {
      Alert.alert('Missing fields', 'Exercise, sets, reps, and weight are required.');
      return;
    }
    if (!session?.user) return;
    setLoading(true);
    try {
      await api.addWorkout(session.user.id, {
        exercise: exercise.trim(),
        sets: parseInt(sets), reps: parseInt(reps), weight: parseFloat(weight),
        rpe: rpe ? parseFloat(rpe) : null, notes: notes.trim(),
      });
      setExercise(''); setSets(''); setReps(''); setWeight(''); setRpe(''); setNotes('');
      loadHistory(session.user.id);
      Alert.alert('Logged!', `${exercise.trim()} — ${sets}x${reps} @ ${weight}kg`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  }

  const groupedByDate = logs.reduce<Record<string, WorkoutLog[]>>((acc, log) => {
    const date = log.logged_at.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const uniqueExercises = [...new Set(logs.map(l => l.exercise))];

  const chartWidth = Dimensions.get('window').width - 64;
  const maxWeight = Math.max(...progressData.map(d => d.weight), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tracker</Text>
      </View>
      <View style={styles.tabs}>
        {(['log', 'history', 'progress'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'log' && (
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Exercise</Text>
            <View style={styles.exerciseRow}>
              <TextInput style={[styles.input, styles.exerciseInput]} value={exercise} onChangeText={(v) => { setExercise(v); setShowExercises(true); }} placeholder="Type or pick..." placeholderTextColor="#555" />
              <TouchableOpacity style={styles.pickButton} onPress={() => setShowExercises(!showExercises)}>
                <Text style={styles.pickText}>{showExercises ? 'Hide' : 'Pick'}</Text>
              </TouchableOpacity>
            </View>
            {showExercises && (
              <View style={styles.exerciseGrid}>
                {COMMON_EXERCISES.filter(e => e.toLowerCase().includes(exercise.toLowerCase())).map(e => (
                  <TouchableOpacity key={e} style={styles.exerciseChip} onPress={() => { setExercise(e); setShowExercises(false); }}>
                    <Text style={styles.chipText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Sets</Text>
              <TextInput style={styles.input} value={sets} onChangeText={setSets} keyboardType="numeric" placeholder="3" placeholderTextColor="#555" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Reps</Text>
              <TextInput style={styles.input} value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="10" placeholderTextColor="#555" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="80" placeholderTextColor="#555" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>RPE (optional)</Text>
              <TextInput style={styles.input} value={rpe} onChangeText={setRpe} keyboardType="numeric" placeholder="7" placeholderTextColor="#555" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="e.g. PR set" placeholderTextColor="#555" />
            </View>
          </View>
          <TouchableOpacity style={[styles.logButton, loading && { opacity: 0.5 }]} onPress={logWorkout} disabled={loading}>
            <Text style={styles.logButtonText}>{loading ? 'Logging...' : 'Log Workout'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === 'history' && (
        <FlatList
          data={Object.entries(groupedByDate)}
          keyExtractor={([date]) => date}
          renderItem={({ item: [date, entries] }) => {
            const volume = entries.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
            return (
              <View style={styles.dayGroup}>
                <Text style={styles.dateHeader}>{date} — {entries.length} exercises, {volume.toLocaleString()}kg volume</Text>
                {entries.map(e => (
                  <View key={e.id} style={styles.logEntry}>
                    <Text style={styles.exerciseName}>{e.exercise}</Text>
                    <Text style={styles.exerciseDetail}>{e.sets}×{e.reps} @ {e.weight}kg{e.rpe ? ` RPE ${e.rpe}` : ''}</Text>
                    {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
                  </View>
                ))}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      {tab === 'progress' && (
        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Select Exercise</Text>
          <View style={styles.exerciseGrid}>
            {uniqueExercises.map(e => (
              <TouchableOpacity key={e} style={[styles.exerciseChip, progressExercise === e && { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' }]} onPress={async () => {
                if (!session?.user) return;
                setProgressExercise(e);
                const data = await api.fetchWorkouts(session.user.id, 50);
                const filtered = data.filter((l: any) => l.exercise === e).reverse();
                setProgressData(filtered);
              }}>
                <Text style={styles.chipText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {progressData.length > 1 && (
            <View style={styles.chart}>
              <Text style={styles.chartTitle}>{progressExercise} — Weight Progression</Text>
              <View style={styles.chartBars}>
                {progressData.map((d, i) => {
                  const h = (d.weight / maxWeight) * 150;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValue}>{d.weight}</Text>
                      <View style={[styles.bar, { height: Math.max(h, 4) }]} />
                      <Text style={styles.barLabel}>{d.logged_at.slice(5, 10)}</Text>
                    </View>
                  );
                })}
              </View>
              {progressData.length >= 2 && (
                <Text style={styles.trend}>
                  Trend: {progressData[progressData.length - 1].weight > progressData[0].weight ? '▲ Increasing' : progressData[progressData.length - 1].weight < progressData[0].weight ? '▼ Decreasing' : '— Stable'}
                </Text>
              )}
            </View>
          )}
          {progressData.length === 1 && <Text style={styles.hint}>Log more sessions to see progress.</Text>}
          {uniqueExercises.length === 0 && <Text style={styles.hint}>Log some workouts first to see progress.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#3b82f6' },
  formContent: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a2a' },
  row: { flexDirection: 'row', gap: 8 },
  exerciseRow: { flexDirection: 'row', gap: 8 },
  exerciseInput: { flex: 1 },
  pickButton: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  pickText: { color: '#3b82f6', fontWeight: '600' },
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  exerciseChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  logButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  listContent: { padding: 12, paddingBottom: 40 },
  dayGroup: { marginBottom: 20 },
  dateHeader: { color: '#666', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  logEntry: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 6 },
  exerciseName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  exerciseDetail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  entryNotes: { color: '#666', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  chart: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginTop: 16 },
  chartTitle: { color: '#e2e8f0', fontWeight: '600', fontSize: 15, marginBottom: 16 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 180 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { color: '#94a3b8', fontSize: 10, marginBottom: 2 },
  bar: { width: '80%', backgroundColor: '#3b82f6', borderRadius: 4, minWidth: 8 },
  barLabel: { color: '#666', fontSize: 9, marginTop: 4 },
  trend: { color: '#94a3b8', fontSize: 14, marginTop: 12, textAlign: 'center' },
  hint: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 24 },
});
