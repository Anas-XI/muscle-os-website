import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1a1a1a', borderTopWidth: 1 },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: () => <Text style={{fontSize: 20}}>💬</Text> }} />
      <Tabs.Screen name="tracker" options={{ title: 'Tracker', tabBarIcon: () => <Text style={{fontSize: 20}}>🏋️</Text> }} />
      <Tabs.Screen name="program" options={{ title: 'Program', tabBarIcon: () => <Text style={{fontSize: 20}}>📋</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <Text style={{fontSize: 20}}>👤</Text> }} />
    </Tabs>
  );
}
