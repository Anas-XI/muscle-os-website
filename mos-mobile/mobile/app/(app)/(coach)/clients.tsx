import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as api from '../../../services/api';

interface Client {
  id: string; name: string; goal: string; last_active: string;
}

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useFocusEffect(useCallback(() => { loadClients(); }, []));

  async function loadClients() {
    const { data: { session } } = api.getSession();
    if (!session?.user) { setLoading(false); return; }
    const data = await api.fetchCoachClients(session.user.id);
    setClients(data || []);
    setLoading(false);
  }

  async function addClient() {
    if (!addEmail.trim()) return;
    setAdding(true);
    const { data: { session } } = api.getSession();
    if (!session?.user) { setAdding(false); return; }
    try {
      await api.addCoachClient(session.user.id, addEmail.trim());
      Alert.alert('Added!', `${addEmail} is now your client.`);
      setAddEmail(''); setShowAdd(false); loadClients();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setAdding(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Clients</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)}>
          <Text style={styles.addText}>{showAdd ? 'Cancel' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>
      {showAdd && (
        <View style={styles.addRow}>
          <TextInput style={styles.input} value={addEmail} onChangeText={setAddEmail} placeholder="Client email" placeholderTextColor="#555" autoCapitalize="none" keyboardType="email-address" />
          <TouchableOpacity style={[styles.addButton, adding && { opacity: 0.5 }]} onPress={addClient} disabled={adding}>
            <Text style={styles.addButtonText}>{adding ? '...' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {clients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No clients yet.</Text>
          <Text style={styles.emptySub}>Add clients by email to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.clientCard} onPress={() => router.push(`/(app)/(coach)/client/${item.id}` as any)}>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientGoal}>{item.goal || 'No goal set'}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
  addRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  addButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 16 },
  emptySub: { color: '#444', fontSize: 14, marginTop: 8, textAlign: 'center' },
  clientCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 8 },
  clientName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  clientGoal: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
});
