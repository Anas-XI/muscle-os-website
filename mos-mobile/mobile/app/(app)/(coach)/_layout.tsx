import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function CoachLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1a1a1a', borderTopWidth: 1 },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: () => <Text style={{fontSize: 20}}>👥</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <Text style={{fontSize: 20}}>👤</Text> }} />
    </Tabs>
  );
}
