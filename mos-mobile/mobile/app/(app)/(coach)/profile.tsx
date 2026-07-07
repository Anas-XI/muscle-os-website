import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as api from '../../../services/api';

export default function CoachProfileScreen() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { session } } = api.getSession();
    if (!session?.user) return;
    api.fetchProfile(session.user.id).then(data => setProfile(data));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Coach Profile</Text>
        <TouchableOpacity onPress={() => api.authSignOut()}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{profile?.name || 'Coach'}</Text>
        <Text style={styles.role}>Coach</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  signOut: { color: '#ef4444', fontSize: 14 },
  content: { padding: 24, alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '700', color: '#fff' },
  role: { fontSize: 14, color: '#666', marginTop: 4 },
});
