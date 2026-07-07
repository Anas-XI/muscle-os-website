import { Stack } from 'expo-router';

export default function ClientRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
