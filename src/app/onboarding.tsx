import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, InputField, PrimaryButton, Screen, Tag } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/hooks/useAppData';
import { ACTIVITY_LABELS, validateProfile } from '@/services/nutrition';
import type { ActivityLevel, Goal } from '@/types';

const goals: { value: Goal; title: string; detail: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { value: 'maintain', title: 'Maintain', detail: 'Build a steady routine', icon: 'leaf-outline' },
  { value: 'gain', title: 'Build muscle', detail: 'Support gradual progress', icon: 'barbell-outline' },
  { value: 'lose', title: 'Lose body fat', detail: 'Approach it sustainably', icon: 'trending-down-outline' },
];

export default function Onboarding(): React.JSX.Element {
  const { saveUserProfile } = useAppData();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [frequency, setFrequency] = useState('3');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const estimatedCalories = useMemo(() => {
    const parsed = validateProfile({ age, heightCm: height, weightKg: weight, trainingFrequency: frequency });
    if (Object.keys(parsed).length > 0) return null;
    const bmr = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age);
    const multiplier = activity === 'sedentary' ? 1.2 : activity === 'moderate' ? 1.55 : activity === 'active' ? 1.725 : 1.375;
    return Math.round((bmr * multiplier + Math.min(180, Math.max(0, (Number(frequency) - 2) * 45)) + (goal === 'gain' ? 250 : goal === 'lose' ? -250 : 0)) / 10) * 10;
  }, [activity, age, frequency, goal, height, weight]);

  async function finish(): Promise<void> {
    const parsed = validateProfile({ age, heightCm: height, weightKg: weight, trainingFrequency: frequency });
    const nextErrors: Record<string, string> = {};
    if (!Number.isInteger(Number(age)) || Number(age) < 13 || Number(age) > 100) nextErrors.age = 'Enter an age between 13 and 100.';
    if (!Number.isFinite(Number(height)) || Number(height) < 120 || Number(height) > 230) nextErrors.height = 'Enter height in cm (120–230).';
    if (!Number.isFinite(Number(weight)) || Number(weight) < 30 || Number(weight) > 300) nextErrors.weight = 'Enter weight in kg (30–300).';
    if (!Number.isInteger(Number(frequency)) || Number(frequency) < 0 || Number(frequency) > 7) nextErrors.frequency = 'Choose 0–7 days per week.';
    if (Object.keys(parsed).length > 0 || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      await saveUserProfile({ name: name.trim() || 'Athlete', age: Number(age), heightCm: Number(height), weightKg: Number(weight), activityLevel: activity, trainingFrequency: Number(frequency), goal, unitSystem: 'metric' });
      router.replace('/(tabs)');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not save your profile.' });
    } finally {
      setSaving(false);
    }
  }

  return <Screen scroll={false}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.brandRow}><View style={styles.brandMark}><AppText variant="heading" color={colors.background}>C</AppText></View><AppText variant="label" color={colors.lime}>CALIS</AppText></View><AppText variant="display">Train with{`\n`}<AppText color={colors.lime}>intention.</AppText></AppText><AppText color={colors.textSecondary} style={styles.intro}>A calm, beginner-first training system that works entirely offline.</AppText><Card style={styles.formCard}><AppText variant="heading">Set up your starting point</AppText><AppText color={colors.textSecondary} style={styles.cardIntro}>These details help estimate your nutrition targets. You can change them anytime.</AppText><InputField label="What should we call you?" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" /><View style={styles.row}><InputField label="Age" placeholder="28" keyboardType="number-pad" value={age} onChangeText={setAge} error={errors.age} style={styles.half} /><InputField label="Height (cm)" placeholder="170" keyboardType="decimal-pad" value={height} onChangeText={setHeight} error={errors.height} style={styles.half} /></View><InputField label="Body weight (kg)" placeholder="70" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} error={errors.weight} /><AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>How active are you on a typical day?</AppText><View style={styles.choiceGrid}>{(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: activity === item }} onPress={() => setActivity(item)} style={[styles.choice, activity === item && styles.choiceSelected]}><View pointerEvents="none" style={[styles.choiceFill, activity === item && styles.choiceSelected]} /><AppText variant="label" color={activity === item ? colors.lime : colors.text}>{item === 'sedentary' ? 'Mostly seated' : item === 'light' ? 'Lightly active' : item === 'moderate' ? 'Active most days' : 'Very active'}</AppText></Pressable>)}</View><AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>Training days per week</AppText><View style={styles.frequencyRow}>{[0, 2, 3, 4, 5].map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: Number(frequency) === item }} onPress={() => setFrequency(String(item))} style={[styles.frequencyChoice, Number(frequency) === item && styles.choiceSelected]}><View pointerEvents="none" style={[styles.choiceFill, Number(frequency) === item && styles.choiceSelected]} /><AppText variant="subheading" color={Number(frequency) === item ? colors.lime : colors.text}>{item}</AppText></Pressable>)}</View><AppText variant="label" color={colors.textSecondary} style={styles.fieldLabel}>Your main goal</AppText><View style={styles.goalList}>{goals.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: goal === item.value }} onPress={() => setGoal(item.value)} style={[styles.goalChoice, goal === item.value && styles.goalSelected]}><View pointerEvents="none" style={[styles.goalFill, goal === item.value && styles.goalSelected]} /><View style={[styles.goalIcon, goal === item.value && styles.goalIconSelected]}><AppText color={goal === item.value ? colors.background : colors.lime}>{item.value === 'maintain' ? '•' : item.value === 'gain' ? '+' : '—'}</AppText></View><View style={styles.goalCopy}><AppText variant="subheading">{item.title}</AppText><AppText color={colors.textSecondary} variant="caption">{item.detail}</AppText></View></Pressable>)}</View>{estimatedCalories ? <View style={styles.estimate}><Tag label="STARTING ESTIMATE" icon="sparkles-outline" color={colors.mint} background={colors.mintDark} /><AppText variant="number" style={styles.estimateNumber}>{estimatedCalories.toLocaleString()} <AppText variant="body" color={colors.textSecondary}>kcal / day</AppText></AppText><AppText variant="caption" color={colors.textSecondary}>An estimate, not a prescription. You can adjust targets later.</AppText></View> : null}{errors.form ? <AppText color={colors.coral} style={styles.formError}>{errors.form}</AppText> : null}<PrimaryButton title="Create my plan" onPress={() => void finish()} loading={saving} icon="arrow-forward" style={styles.continueButton} /></Card><View style={styles.safety}><AppText variant="caption" color={colors.textMuted}>Calis is general fitness guidance, not medical advice. Start gradually and stop if an exercise causes pain.</AppText></View></ScrollView></KeyboardAvoidingView></Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.sm, marginBottom: spacing.xxxl },
  brandMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  intro: { marginTop: spacing.md, marginBottom: spacing.xxxl, maxWidth: 330, lineHeight: 23 },
  formCard: { gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.surfaceRaised },
  cardIntro: { marginTop: -spacing.sm, lineHeight: 21 },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  fieldLabel: { marginTop: spacing.sm },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 46, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: spacing.md, flexGrow: 1 },
  choiceFill: { ...StyleSheet.absoluteFill, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  choiceSelected: { borderColor: colors.lime, backgroundColor: colors.limeDark },
  goalFill: { ...StyleSheet.absoluteFill, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  frequencyRow: { flexDirection: 'row', gap: spacing.sm },
  frequencyChoice: { flex: 1, height: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  goalList: { gap: spacing.sm },
  goalChoice: { minHeight: 68, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  goalSelected: { borderColor: colors.lime, backgroundColor: colors.limeDark },
  goalIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft, marginRight: spacing.md },
  goalIconSelected: { backgroundColor: colors.lime },
  goalCopy: { flex: 1, gap: 2 },
  estimate: { borderRadius: radii.md, backgroundColor: colors.mintDark, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: '#356A54' },
  estimateNumber: { marginTop: 3 },
  formError: { marginTop: -spacing.sm },
  continueButton: { marginTop: spacing.sm },
  safety: { paddingHorizontal: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.lg },
});
