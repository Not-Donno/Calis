import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';

function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }): React.JSX.Element {
  return <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}><Ionicons name={name} size={22} color={focused ? colors.background : color} /></View>;
}

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background }, tabBarActiveTintColor: colors.lime, tabBarInactiveTintColor: colors.textMuted, tabBarLabelStyle: styles.label, tabBarStyle: [styles.bar, { height: 68 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) }], tabBarItemStyle: styles.item, tabBarHideOnKeyboard: true }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={color as string} focused={focused} /> }} />
    <Tabs.Screen name="workout" options={{ title: 'Train', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} color={color as string} focused={focused} /> }} />
    <Tabs.Screen name="nutrition" options={{ title: 'Fuel', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} color={color as string} focused={focused} /> }} />
    <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color as string} focused={focused} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color as string} focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  bar: { height: 86, paddingTop: 9, paddingBottom: 12, backgroundColor: colors.backgroundSoft, borderTopColor: colors.borderStrong, borderTopWidth: 1, elevation: 12, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
  item: { paddingTop: 2, paddingHorizontal: 2 },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 0.2, marginTop: 3 },
  iconWrap: { width: 38, height: 30, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  iconWrapFocused: { backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
});
