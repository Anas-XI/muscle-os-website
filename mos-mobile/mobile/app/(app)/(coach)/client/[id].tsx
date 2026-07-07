import { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as api from '../../../../services/api';

type Tab = 'profile' | 'program' | 'checkin' | 'workouts' | 'chat';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    const [prof, prog, ci, wo, msgs] = await Promise.all([
      api.fetchProfile(id),
      api.fetchActiveProgram(id).catch(() => null),
      api.fetchCheckins(id, 10),
      api.fetchWorkouts(id, 30),
      api.fetchChatHistory(id, 50),
    ]);
    setProfile(prof);
    setProgram(prog);
    setCheckins(ci || []);
    setWorkouts(wo || []);
    setMessages((msgs?.messages || []).reverse());
    setClientName(prof?.name || 'Client');
    setLoading(false);
  }

  const fields = profile ? [
    ['Goal', profile.goal], ['Experience', profile.experience],
    ['Weight', profile.weight ? `${profile.weight} kg` : null],
    ['Height', profile.height ? `${profile.height} cm` : null],
    ['Age', profile.age], ['Training', `${profile.training_days ?? '?'} days/wk`],
    ['Sleep', profile.sleep], ['Stress', profile.stress],
    ['Injuries', profile.injuries?.length ? profile.injuries.join(', ') : 'None'],
  ].filter(f => f[1]) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>{'< Back'}</Text></TouchableOpacity>
        <Text style={styles.title}>{clientName}</Text>
        <View style={{ width: 50 }} />
      </View>
      <View style={styles.tabs}>
          {(['profile', 'program', 'checkin', 'workouts', 'chat'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'profile' && !profile && <Text style={styles.empty}>No profile data.</Text>}
        {tab === 'profile' && profile && fields.map(([label, value], i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        {tab === 'program' && !program && <Text style={styles.empty}>No program generated.</Text>}
        {tab === 'program' && program && <Text style={styles.programText}>{program.content}</Text>}
        {tab === 'checkin' && checkins.length === 0 && <Text style={styles.empty}>No check-ins yet.</Text>}
        {tab === 'checkin' && checkins.map((c: any) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle}>Week {c.checkin_number} — {c.created_at?.slice(0, 10)}</Text>
            <Text style={styles.cardDetail}>
              Weight: {c.weight ? `${c.weight}kg` : '-'} | Sleep: {c.sleep_hours ? `${c.sleep_hours}h` : '-'} | Readiness: {c.readiness ?? '-'}/5
            </Text>
            <Text style={styles.cardDetail}>
              Adherence: {c.adherence ?? '-'}/5 | Soreness: {c.soreness ?? '-'}/5 | Sleep Quality: {c.sleep_quality ?? '-'}/5
            </Text>
            {c.notes ? <Text style={styles.cardDate}>{c.notes}</Text> : null}
          </View>
        ))}
        {tab === 'workouts' && workouts.length === 0 && <Text style={styles.empty}>No workouts logged.</Text>}
        {tab === 'workouts' && workouts.map((w: any) => (
          <View key={w.id} style={styles.card}>
            <Text style={styles.cardTitle}>{w.exercise}</Text>
            <Text style={styles.cardDetail}>{w.sets}x{w.reps} @ {w.weight}kg{w.rpe ? ` RPE ${w.rpe}` : ''}</Text>
            <Text style={styles.cardDate}>{w.logged_at?.slice(0, 10)}</Text>
          </View>
        ))}
        {tab === 'chat' && messages.length === 0 && <Text style={styles.empty}>No messages.</Text>}
        {tab === 'chat' && messages.slice(-30).map((m: any) => (
          <View key={m.id} style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgAssistant]}>
            <Text style={[styles.msgText, m.role === 'user' ? styles.msgUserText : styles.msgAssistantText]}>{m.content}</Text>
            <Text style={styles.msgDate}>{m.created_at?.slice(0, 16)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  back: { color: '#3b82f6', fontSize: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, padding: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { color: '#666', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#3b82f6' },
  content: { padding: 16, paddingBottom: 40 },
  empty: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 40 },
  field: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  programText: { color: '#e2e8f0', fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 8 },
  cardTitle: { color: '#fff', fontWeight: '600' },
  cardDetail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  cardDate: { color: '#666', fontSize: 11, marginTop: 4 },
  msg: { padding: 12, borderRadius: 8, marginBottom: 6 },
  msgUser: { backgroundColor: '#1e3a5f', alignSelf: 'flex-end' },
  msgAssistant: { backgroundColor: '#1a1a1a' },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgUserText: { color: '#fff' },
  msgAssistantText: { color: '#e2e8f0' },
  msgDate: { color: '#666', fontSize: 10, marginTop: 4, textAlign: 'right' },
});
