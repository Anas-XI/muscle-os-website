import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import * as api from '../../services/api';

export default function AppLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { session } } = api.getSession();
    if (session?.user) {
      api.fetchProfile(session.user.id).then(data => {
        setRole(data?.role || 'client');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#3b82f6" /></View>;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={role === 'coach' ? '(coach)' : '(client)'} />
    </Stack>
  );
}
