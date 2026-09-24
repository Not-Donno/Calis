import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, PrimaryButton, Screen, SectionHeader, Tag, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { EXERCISE_BY_ID, formatDateKey, getWeekDates, getWorkoutForDate, PROGRAM_NOTES } from '@/data/program';
import { formatDayNumber, formatShortDate, formatWeekday } from '@/utils/format';
import { getWorkoutHistory } from '@/db/repositories';
import { useAppData } from '@/hooks/useAppData';

export default function WorkoutPlanScreen(): React.JSX.Element {
  const { startWorkout } = useAppData();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWorkoutHistory>>>([]);
  const [starting, setStarting] = useState(false);
  const dates = useMemo(() => getWeekDates(new Date()), []);
  const workout = useMemo(() => getWorkoutForDate(selectedDate), [selectedDate]);
  const selectedKey = formatDateKey(selectedDate);

  const load = useCallback(async () => setHistory(await getWorkoutHistory()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const completed = history.find((item) => item.date === selectedKey);

  async function start(): Promise<void> {
    if (starting) return;
    setStarting(true);
    try {
      const session = await startWorkout(selectedDate);
      if (session.id === undefined) throw new Error('Workout session ID was not created.');
      router.push({ pathname: '/workout/[sessionId]', params: { sessionId: String(session.id) } });
    } catch {
      Alert.alert('Could not start workout', 'Your local session could not be created. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  return <Screen><View style={styles.header}><View><AppText variant="caption" color={colors.lime}>YOUR PROGRAM</AppText><AppText variant="title">Beginner foundations</AppText></View><Tag label="7 DAYS" color={colors.mint} background={colors.mintDark} icon="calendar-outline" /></View><TextButton title="How this plan works" icon="help-circle-outline" onPress={() => router.push('/plan-info')} /><Card style={styles.weekPicker}><View style={styles.weekDates}>{dates.map((date) => { const active = formatDateKey(date) === selectedKey; const day = getWorkoutForDate(date); return <Pressable key={date.toISOString()} accessibilityRole="button" accessibilityLabel={`${formatShortDate(date)}, ${day.title}`} accessibilityState={{ selected: active }} onPress={() => setSelectedDate(date)} style={[styles.dateChoice, active && styles.dateChoiceActive]}><View pointerEvents="none" style={[styles.dateFill, active && styles.dateChoiceActive]} /><AppText variant="caption" color={active ? colors.background : colors.textMuted}>{formatWeekday(date)}</AppText><AppText variant="subheading" color={active ? colors.background : colors.text}>{formatDayNumber(date)}</AppText><View style={[styles.dateLine, { backgroundColor: active ? colors.background : day.isRest ? colors.mint : colors.border }]} /></Pressable>; })}</View></Card><Card style={[styles.workoutHero, workout.isRest && styles.restCard]}><View style={styles.workoutHeroTop}><View style={styles.workoutIcon}><Ionicons name={workout.isRest ? 'moon-outline' : workout.focus.includes('Mobility') ? 'walk-outline' : 'barbell-outline'} size={23} color={workout.isRest ? colors.mint : colors.lime} /></View><View style={styles.heroCopy}><AppText variant="caption" color={workout.isRest ? colors.mint : colors.lime}>{selectedDate.toDateString() === new Date().toDateString() ? 'TODAY' : formatShortDate(selectedDate).toUpperCase()}</AppText><AppText variant="heading">{workout.title}</AppText><AppText color={colors.textSecondary} variant="caption">{workout.subtitle}</AppText></View></View>{workout.isRest ? <View style={styles.restCopy}><AppText color={colors.textSecondary}>No required workout. Take a walk, get outside, and let your body recover.</AppText><Tag label="REST IS PART OF THE PLAN" color={colors.mint} background={colors.mintDark} icon="leaf-outline" /></View> : <><View style={styles.workoutStats}><View><AppText variant="number">{workout.durationMinutes}</AppText><AppText variant="caption" color={colors.textSecondary}>MINUTES</AppText></View><View><AppText variant="number">{workout.exercises.length}</AppText><AppText variant="caption" color={colors.textSecondary}>MOVEMENTS</AppText></View><View><AppText variant="number">{workout.exercises.reduce((sum, item) => sum + item.sets, 0)}</AppText><AppText variant="caption" color={colors.textSecondary}>SETS</AppText></View></View><PrimaryButton title={completed ? 'View history' : 'Start workout'} onPress={() => completed ? router.push('/history') : void start()} loading={!completed && starting} icon={completed ? 'checkmark-circle-outline' : 'play'} style={styles.startButton} /></>}</Card><SectionHeader title="Warm-up" action={workout.warmup.length > 0 ? 'Details' : undefined} onAction={workout.warmup.length > 0 ? () => router.push({ pathname: '/exercise', params: { exerciseId: 'arm-circles' } }) : undefined} />{workout.warmup.length > 0 ? <Card style={styles.warmupCard}>{workout.warmup.map((item, index) => <View key={item} style={styles.warmupRow}><View style={styles.warmupNumber}><AppText variant="caption" color={colors.lime}>{String(index + 1).padStart(2, '0')}</AppText></View><AppText color={colors.textSecondary} style={styles.warmupText}>{item}</AppText></View>)}</Card> : <Card><AppText color={colors.textSecondary}>Recovery day. Keep movement easy and comfortable.</AppText></Card>}{!workout.isRest ? <><SectionHeader title="Main session" /><Card style={styles.exerciseList}>{workout.exercises.map((item, index) => { const exercise = EXERCISE_BY_ID[item.exerciseId]; if (!exercise) return null; return <Pressable key={item.exerciseId} accessibilityRole="button" onPress={() => router.push({ pathname: '/exercise', params: { exerciseId: exercise.id } })} style={({ pressed }) => [styles.exerciseRow, index < workout.exercises.length - 1 && styles.rowBorder, pressed && styles.pressed]}><View style={styles.exerciseIndex}><AppText variant="caption" color={colors.textMuted}>{String(index + 1).padStart(2, '0')}</AppText></View><View style={styles.exerciseCopy}><AppText variant="subheading">{exercise.name}</AppText><AppText variant="caption" color={colors.textSecondary}>{item.sets} × {item.durationSec ? `${item.durationSec}s` : `${item.repMin}–${item.repMax}`} · {exercise.muscles.join(' · ')}</AppText></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>; })}</Card></> : null}<Card style={styles.evidenceCard}><View style={styles.evidenceIcon}><Ionicons name="shield-checkmark-outline" size={20} color={colors.mint} /></View><View style={styles.evidenceCopy}><AppText variant="subheading">Built for beginners</AppText>{PROGRAM_NOTES.map((note) => <AppText key={note} variant="caption" color={colors.textSecondary} style={styles.evidenceLine}>{note}</AppText>)}</View></Card></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  weekPicker: { padding: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl, backgroundColor: colors.surfaceRaised },
  weekDates: { flexDirection: 'row', justifyContent: 'space-between' },
  dateChoice: { flex: 1, minHeight: 70, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dateFill: { ...StyleSheet.absoluteFill, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  dateChoiceActive: { backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  dateLine: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  workoutHero: { backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong, gap: spacing.xl },
  restCard: { backgroundColor: colors.mintDark, borderColor: '#356A54' },
  workoutHeroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workoutIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 3 },
  workoutStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  startButton: { minHeight: 54 },
  restCopy: { gap: spacing.lg },
  warmupCard: { gap: spacing.md, backgroundColor: colors.surfaceRaised },
  warmupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  warmupNumber: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  warmupText: { flex: 1 },
  exerciseList: { paddingVertical: 0, paddingHorizontal: spacing.lg },
  exerciseRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseIndex: { width: 24 },
  exerciseCopy: { flex: 1, gap: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  evidenceCard: { marginTop: spacing.xxxl, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.mintDark, borderColor: '#356A54' },
  evidenceIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#23483A', alignItems: 'center', justifyContent: 'center' },
  evidenceCopy: { flex: 1, gap: 5 },
  evidenceLine: { marginTop: 1 },
});
