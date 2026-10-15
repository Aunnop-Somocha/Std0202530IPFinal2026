import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Login' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, title: 'Dashboard' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
