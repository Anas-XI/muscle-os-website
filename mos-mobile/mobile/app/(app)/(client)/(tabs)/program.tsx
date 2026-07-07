import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as api from '../../../../services/api';

export default function ProgramScreen() {
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadProgram(); }, []);

  async function loadProgram() {
    const { data: { session } } = api.getSession();
    if (!session?.user) { setLoading(false); return; }
    try {
      const data = await api.fetchActiveProgram(session.user.id);
      setProgram(data);
    } catch {
      setProgram(null);
    }
    setLoading(false);
  }

  async function generateProgram() {
    const { data: { session } } = api.getSession();
    if (!session?.user) return;
    setGenerating(true);
    try {
      await api.generateProgram(session.user.id);
      await loadProgram();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Program</Text>
        <TouchableOpacity onPress={generateProgram} disabled={generating}>
          <Text style={styles.generateText}>{generating ? 'Generating...' : 'Generate New'}</Text>
        </TouchableOpacity>
      </View>
      {program ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.markdown}>{program.content}</Text>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No program yet.</Text>
          <TouchableOpacity style={styles.button} onPress={generateProgram} disabled={generating}>
            <Text style={styles.buttonText}>Generate Program</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  generateText: { color: '#3b82f6', fontSize: 14 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center' },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16 },
  markdown: { color: '#e2e8f0', fontSize: 14, lineHeight: 22 },
});
