import { Ionicons } from '@expo/vector-icons';
import { router, Redirect, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, PrimaryButton, ProgressBar, Screen, SectionHeader, Tag } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { getWorkoutForDate, getWeekDates, formatDateKey } from '@/data/program';
import { formatDayNumber, formatNumber, formatShortDate, formatWeekday } from '@/utils/format';
import { useAppData } from '@/hooks/useAppData';
import { getFoodLogs, getWorkoutHistory } from '@/db/repositories';
import { emptyMacros } from '@/services/nutrition';
import type { MacroTotals } from '@/types';

export default function HomeScreen(): React.JSX.Element {
  const { profile, settings, targets, startTodayWorkout, ready } = useAppData();
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof getFoodLogs>>>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWorkoutHistory>>>([]);
  const [starting, setStarting] = useState(false);
  const today = useMemo(() => new Date(), []);
  const workout = useMemo(() => getWorkoutForDate(today), [today]);
  const dateKey = formatDateKey(today);
  const completedToday = history.find((item) => item.date === dateKey);

  const load = useCallback(async () => {
    const [nextLogs, nextHistory] = await Promise.all([getFoodLogs(dateKey), getWorkoutHistory()]);
    setLogs(nextLogs);
    setHistory(nextHistory);
  }, [dateKey]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totals = useMemo<MacroTotals>(() => logs.reduce((sum, log) => ({ calories: sum.calories + log.calories, protein: sum.protein + log.protein, carbs: sum.carbs + log.carbs, fat: sum.fat + log.fat, fiber: sum.fiber + log.fiber }), emptyMacros()), [logs]);
  const calorieGoal = targets?.calories ?? 2200;
  const calorieProgress = calorieGoal ? totals.calories / calorieGoal : 0;
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  async function startWorkout(): Promise<void> {
    if (starting) return;
    setStarting(true);
    try {
      const session = await startTodayWorkout();
      if (session.id === undefined) throw new Error('Workout session ID was not created.');
      router.push({ pathname: '/workout/[sessionId]', params: { sessionId: String(session.id) } });
    } catch {
      Alert.alert('Could not start workout', 'Your local session could not be created. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  if (!ready) return <View />;
  if (!profile || !settings?.onboardingComplete) return <Redirect href="/onboarding" />;

  return <Screen><View style={styles.header}><View style={styles.brand}><View style={styles.mark}><AppText variant="subheading" color={colors.background}>C</AppText></View><View><AppText variant="label" color={colors.lime}>CALIS</AppText><AppText variant="caption" color={colors.textMuted}>OFFLINE COACH</AppText></View></View><IconButton name="person-outline" label="Open profile" onPress={() => router.push('/(tabs)/settings')} /></View><View style={styles.greeting}><AppText variant="caption" color={colors.textSecondary}>{formatShortDate(today).toUpperCase()} · {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(today).toUpperCase()}</AppText><AppText variant="title">{profile?.name ? `Good morning, ${profile.name}.` : 'Good morning, athlete.'}</AppText><AppText color={colors.textSecondary}>Small, consistent work adds up.</AppText></View><Card style={[styles.hero, workout.isRest && styles.restHero]}><View style={styles.heroTop}><View><AppText variant="caption" color={workout.isRest ? colors.mint : colors.lime}>{workout.isRest ? 'RECOVERY DAY' : "TODAY'S SESSION"}</AppText><AppText variant="title" style={styles.heroTitle}>{workout.title}</AppText><AppText color={colors.textSecondary} style={styles.heroSubtitle}>{workout.subtitle}</AppText></View><View style={[styles.dayBadge, { backgroundColor: workout.isRest ? colors.mintDark : colors.limeDark }]}><Ionicons name={workout.isRest ? 'moon-outline' : 'barbell-outline'} size={20} color={workout.isRest ? colors.mint : colors.lime} /></View></View><View style={styles.heroBottom}><View style={styles.heroMeta}><Ionicons name="time-outline" size={15} color={colors.textSecondary} /><AppText variant="caption" color={colors.textSecondary}>{workout.isRest ? 'No required workout' : `${workout.durationMinutes} min · ${workout.exercises.length} movements`}</AppText></View>{completedToday ? <Tag label={`${completedToday.completedSets}/${completedToday.totalSets} SETS`} color={colors.mint} background={colors.mintDark} icon="checkmark-circle-outline" /> : workout.isRest ? <Tag label="RECOVERY" color={colors.mint} background={colors.mintDark} icon="leaf-outline" /> : <PrimaryButton title="Start workout" onPress={() => void startWorkout()} loading={starting} icon="play" style={styles.heroButton} />}</View></Card><View style={styles.quickRow}><QuickAction icon="barbell-outline" label="Train" detail="Build strength" onPress={() => router.push('/(tabs)/workout')} /><QuickAction icon="restaurant-outline" label="Fuel" detail="Log a meal" onPress={() => router.push('/(tabs)/nutrition')} /><QuickAction icon="camera-outline" label="Form" detail="Check a rep" onPress={() => router.push('/camera')} /></View><SectionHeader title="Nutrition today" action="Open log" onAction={() => router.push('/(tabs)/nutrition')} /><Card style={styles.nutritionCard}><View style={styles.calorieRow}><View><AppText variant="caption" color={colors.textSecondary}>CALORIES</AppText><AppText variant="number">{formatNumber(totals.calories)} <AppText variant="body" color={colors.textMuted}>/ {formatNumber(calorieGoal)} kcal</AppText></AppText></View><View style={styles.calorieBadge}><AppText variant="label" color={calorieProgress > 1 ? colors.amber : colors.lime}>{Math.round(calorieProgress * 100)}%</AppText></View></View><ProgressBar value={calorieProgress} color={calorieProgress > 1 ? colors.amber : colors.lime} height={8} style={styles.calorieBar} /><View style={styles.macroGrid}><Macro label="Protein" value={totals.protein} goal={targets?.protein ?? 120} unit="g" color={colors.mint} /><Macro label="Carbs" value={totals.carbs} goal={targets?.carbs ?? 275} unit="g" color={colors.amber} /><Macro label="Fat" value={totals.fat} goal={targets?.fat ?? 73} unit="g" color={colors.coral} /></View><Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/nutrition')} style={styles.logCta}><Ionicons name="add-circle-outline" size={18} color={colors.lime} /><AppText variant="label" color={colors.lime}>Log food</AppText><Ionicons name="arrow-forward" size={16} color={colors.lime} /></Pressable></Card><SectionHeader title="Your week" action="See plan" onAction={() => router.push('/(tabs)/workout')} /><Card style={styles.weekCard}><View style={styles.weekRow}>{weekDates.map((date) => { const active = formatDateKey(date) === dateKey; const day = getWorkoutForDate(date); return <View key={dateKey + date.toISOString()} style={styles.weekDay}><AppText variant="caption" color={active ? colors.lime : colors.textMuted}>{formatWeekday(date).slice(0, 1)}</AppText><View style={[styles.weekCircle, active && styles.weekCircleActive, day.isRest && !active && styles.weekCircleRest]}><AppText variant="label" color={active ? colors.background : day.isRest ? colors.mint : colors.text}>{formatDayNumber(date)}</AppText></View><View style={[styles.weekDot, { backgroundColor: active ? colors.lime : day.isRest ? colors.mint : colors.border }]} /></View>; })}</View><View style={styles.weekNote}><Ionicons name="sparkles-outline" size={16} color={colors.lime} /><AppText variant="caption" color={colors.textSecondary} style={styles.weekNoteText}>Technique first. Leave 2–3 reps in reserve.</AppText></View></Card></Screen>;
}

function QuickAction({ icon, label, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${detail}`} onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={styles.quickActionSurface}><View style={styles.quickIcon}><Ionicons name={icon} size={19} color={colors.lime} /></View><AppText variant="label">{label}</AppText><AppText variant="caption" color={colors.textMuted}>{detail}</AppText></View></Pressable>;
}

function Macro({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }): React.JSX.Element {
  return <View style={styles.macro}><View style={styles.macroTitle}><AppText variant="caption" color={colors.textSecondary}>{label}</AppText><AppText variant="caption" color={colors.text}>{Math.round(value)} / {goal}{unit}</AppText></View><ProgressBar value={goal ? value / goal : 0} color={color} height={5} /></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, marginBottom: spacing.xxl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  greeting: { gap: 6, marginBottom: spacing.xl },
  hero: { padding: spacing.xl, backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong, gap: spacing.xl, shadowOpacity: 0, elevation: 0, overflow: 'visible' },
  restHero: { backgroundColor: colors.mintDark, borderColor: '#356A54' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  heroTitle: { marginTop: 8, marginBottom: 5 },
  heroSubtitle: { maxWidth: 245, lineHeight: 21 },
  dayBadge: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, position: 'relative', zIndex: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  heroButton: { minHeight: 48, paddingHorizontal: spacing.md, backgroundColor: colors.lime, zIndex: 10, elevation: 10 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickAction: { flex: 1, minHeight: 116 },
  quickActionSurface: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, justifyContent: 'space-between', shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  quickIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  nutritionCard: { gap: spacing.lg },
  calorieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calorieBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.limeDark },
  calorieBar: { marginTop: -7 },
  macroGrid: { gap: spacing.md },
  macro: { gap: 7 },
  macroTitle: { flexDirection: 'row', justifyContent: 'space-between' },
  logCta: { minHeight: 46, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  weekCard: { gap: spacing.lg },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 7, flex: 1 },
  weekCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  weekCircleActive: { backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.25, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  weekCircleRest: { borderWidth: 1, borderColor: colors.mintDark },
  weekDot: { width: 5, height: 5, borderRadius: 3 },
  weekNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  weekNoteText: { flex: 1 },
});
