import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { ErrorState, LoadingState } from '@/components/ui';
import { colors } from '@/constants/theme';

function AppGate(): React.JSX.Element {
  const { ready, error, refresh } = useAppData();
  if (error) return <View style={{ flex: 1, backgroundColor: colors.background }}><ErrorState message={`${error} Your data stays on this device; please try again.`} onRetry={() => void refresh()} /></View>;
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }}><LoadingState /></View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }} />;
}

export default function RootLayout(): React.JSX.Element {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><AppDataProvider><StatusBar style="light" /><AppGate /></AppDataProvider></SafeAreaProvider></GestureHandlerRootView>;
}
