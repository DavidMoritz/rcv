import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#12355b' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f5f7fa' },
        }}>
        <Stack.Screen name="index" options={{ title: 'Ranked Choices' }} />
        <Stack.Screen name="ballot/[key]/index" options={{ title: 'Ballot' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
