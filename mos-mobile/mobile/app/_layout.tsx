import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as api from '../services/api';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    api.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfileExists(session.user.id);
      else setProfileComplete(null);
    });
  }, []);

  async function checkAuth() {
    const { data: { session } } = api.getSession();
    setSession(session);
    if (session?.user) {
      await checkProfileExists(session.user.id);
    } else {
      setLoading(false);
    }
  }

  async function checkProfileExists(userId: string) {
    const data = await api.fetchProfile(userId);
    setProfileComplete(data?.completed === true);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {session ? (
        profileComplete ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          </Stack>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        )
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      )}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </>
  );
}
