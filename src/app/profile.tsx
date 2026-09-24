import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, InputField, PrimaryButton, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/hooks/useAppData';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/services/nutrition';
import type { ActivityLevel, Goal } from '@/types';

export default function ProfileScreen(): React.JSX.Element {
  const { profile, saveUserProfile, settings } = useAppData();
  const unitSystem = settings?.units ?? 'metric';
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [height, setHeight] = useState(String(profile ? unitSystem === 'imperial' ? (profile.heightCm / 2.54).toFixed(1) : profile.heightCm.toFixed(1) : ''));
  const [weight, setWeight] = useState(String(profile ? unitSystem === 'imperial' ? (profile.weightKg * 2.2046226218).toFixed(1) : profile.weightKg.toFixed(1) : ''));
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activityLevel ?? 'light');
  const [frequency, setFrequency] = useState(String(profile?.trainingFrequency ?? 3));
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(): Promise<void> {
    const heightCm = unitSystem === 'imperial' ? Number(height) * 2.54 : Number(height);
    const weightKg = unitSystem === 'imperial' ? Number(weight) / 2.2046226218 : Number(weight);
    const ageValue = Number(age);
    const frequencyValue = Number(frequency);
    if (!Number.isInteger(ageValue) || ageValue < 13 || ageValue > 100 || !Number.isInteger(frequencyValue) || frequencyValue < 0 || frequencyValue > 7 || !Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm < 120 || heightCm > 230 || weightKg < 30 || weightKg > 300) {
      setError('Check your age, training days, height, and weight values.');
      return;
    }
    setSaving(true);
    try { await saveUserProfile({ name, age: Number(age), heightCm, weightKg, activityLevel: activity, trainingFrequency: Number(frequency), goal, unitSystem }); router.back(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save profile.'); } finally { setSaving(false); }
  }

  return <Screen scroll={false}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.header}><IconButton name="arrow-back" label="Go back" onPress={() => router.back()} /><AppText variant="title" style={styles.headerTitle}>Profile</AppText><View style={styles.headerSpacer} /></View><AppText color={colors.textSecondary} style={styles.intro}>Your profile is used only on this device to estimate your starting nutrition targets.</AppText><Card style={styles.card}><InputField label="Name" value={name} onChangeText={setName} placeholder="Your name" /><View style={styles.row}><InputField label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="28" style={styles.half} /><InputField label={unitSystem === 'imperial' ? 'Height (in)' : 'Height (cm)'} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="170" style={styles.half} /></View><InputField label={unitSystem === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="70" /><AppText variant="label" color={colors.textSecondary} style={styles.label}>Activity level</AppText><View style={styles.options}>{(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={ACTIVITY_LABELS[item]} accessibilityState={{ selected: activity === item }} onPress={() => setActivity(item)} style={styles.option}><View style={[styles.optionSurface, activity === item && styles.optionSelected]}><AppText variant="label" color={activity === item ? colors.lime : colors.textSecondary}>{ACTIVITY_LABELS[item]}</AppText></View></Pressable>)}</View><AppText variant="label" color={colors.textSecondary} style={styles.label}>Training days / week</AppText><View style={styles.frequency}>{[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`${item} training days per week`} accessibilityState={{ selected: Number(frequency) === item }} onPress={() => setFrequency(String(item))} style={styles.frequencyChoice}><View style={[styles.optionSurface, Number(frequency) === item && styles.optionSelected]}><AppText variant="label" color={Number(frequency) === item ? colors.lime : colors.text}>{item}</AppText></View></Pressable>)}</View><AppText variant="label" color={colors.textSecondary} style={styles.label}>Goal</AppText><View style={styles.options}>{(Object.keys(GOAL_LABELS) as Goal[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={GOAL_LABELS[item]} accessibilityState={{ selected: goal === item }} onPress={() => setGoal(item)} style={styles.option}><View style={[styles.optionSurface, goal === item && styles.optionSelected]}><AppText variant="label" color={goal === item ? colors.lime : colors.textSecondary}>{GOAL_LABELS[item]}</AppText></View></Pressable>)}</View>{error ? <AppText color={colors.coral}>{error}</AppText> : null}<PrimaryButton title="Save profile" onPress={() => void save()} loading={saving} icon="checkmark" /></Card><AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>You can change these values at any time. Calis does not diagnose, prescribe, or replace medical advice.</AppText></ScrollView></KeyboardAvoidingView></Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 42 },
  intro: { marginBottom: spacing.xl },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  label: { marginTop: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 46, flexGrow: 1 },
  optionSurface: { flex: 1, minHeight: 46, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.md, justifyContent: 'center' },
  optionSelected: { borderColor: colors.lime, backgroundColor: colors.limeDark },
  frequency: { flexDirection: 'row', gap: 5 },
  frequencyChoice: { flex: 1, height: 46, borderRadius: 11 },
  disclaimer: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
