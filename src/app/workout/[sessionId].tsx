import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Card, CheckCircle, Divider, IconButton, InputField, PrimaryButton, ProgressBar, Screen, SecondaryButton, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { EXERCISE_BY_ID } from '@/data/program';
import { useAppData } from '@/hooks/useAppData';
import { completeSession, getSession, saveSetLog } from '@/db/repositories';
import type { SessionExercise, WorkoutSession } from '@/types';
import { formatDuration } from '@/utils/format';

function currentTimeMs(): number {
  return Date.now();
}

export default function ActiveWorkoutScreen(): React.JSX.Element {
  const { settings } = useAppData();
  const { sessionId, formReps, formGoodReps, formScore, formFeedback, formExerciseId, formSet } = useLocalSearchParams<{ sessionId: string; formReps?: string; formGoodReps?: string; formScore?: string; formFeedback?: string; formExerciseId?: string; formSet?: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [formMetadata, setFormMetadata] = useState<Record<string, { goodReps?: number; score?: number; feedback?: string }>>({});
  const [notes, setNotes] = useState('');
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [savingSet, setSavingSet] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const appliedFormResultRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const next = await getSession(Number(sessionId));
        if (cancelled) return;
        setSession(next);
        setNotes(next.notes ?? '');
      } catch {
        if (!cancelled) {
          Alert.alert('Workout unavailable', 'This local workout could not be opened.');
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (restUntil) setRemaining(Math.max(0, Math.ceil((restUntil - currentTimeMs()) / 1000)));
    }, 250);
    return () => clearInterval(timer);
  }, [restUntil]);

  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((currentTimeMs() - Date.parse(session.startedAt)) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!formReps || !formExerciseId || !session?.id) return;
    const resultKey = `${formExerciseId}_${formSet ?? '1'}_${formReps}_${formGoodReps ?? ''}_${formScore ?? ''}_${formFeedback ?? ''}`;
    if (appliedFormResultRef.current === resultKey) return;
    appliedFormResultRef.current = resultKey;
    const key = `${formExerciseId}_${formSet ?? '1'}`;
    const parsedGoodReps = formGoodReps ? Number(formGoodReps) : undefined;
    const parsedScore = formScore ? Number(formScore) : undefined;
    // Route params are the hand-off from the camera screen.
    setValues((current) => ({ ...current, [key]: formReps }));
    setFormMetadata((current) => ({ ...current, [key]: { goodReps: parsedGoodReps !== undefined && Number.isFinite(parsedGoodReps) ? parsedGoodReps : undefined, score: parsedScore !== undefined && Number.isFinite(parsedScore) ? parsedScore : undefined, feedback: formFeedback } }));
    // Camera results are deliberately applied as input; the user still confirms the set.
  }, [formExerciseId, formFeedback, formGoodReps, formReps, formScore, formSet, session?.id]);

  const activeExercise: SessionExercise | undefined = session?.exercises[activeIndex];
  const completedSets = useMemo(() => session?.exercises.flatMap((item) => item.sets).filter((set) => set.completed).length ?? 0, [session]);
  const totalSets = useMemo(() => session?.exercises.reduce((sum, item) => sum + item.plannedSets, 0) ?? 0, [session]);
  const progress = totalSets ? completedSets / totalSets : 0;

  function updateValue(setKey: string, value: string): void {
    setValues((current) => ({ ...current, [setKey]: value }));
  }

  async function toggleSet(item: SessionExercise, setNumber: number): Promise<void> {
    if (!session) return;
    const existing = item.sets.find((set) => set.setNumber === setNumber);
    if (!existing) return;
    const key = `${item.exerciseId}_${setNumber}`;
    const isDuration = item.durationSec !== undefined;
    const raw = values[key] ?? (isDuration ? existing.durationSec?.toString() ?? '' : existing.actualReps?.toString() ?? '');
    const actual = isDuration ? undefined : Number(raw);
    const duration = isDuration ? Number(raw) : undefined;
    const cameraResult = formMetadata[key];
    if (!existing.completed && ((isDuration && (duration === undefined || !Number.isInteger(duration) || duration < 1)) || (!isDuration && (actual === undefined || !Number.isInteger(actual) || actual < 1)))) {
      Alert.alert('Add your result', isDuration ? 'Enter a whole number of seconds.' : 'Enter a whole number of reps.');
      return;
    }
    setSavingSet(true);
    try {
      await saveSetLog({ ...existing, sessionExerciseId: item.id ?? 0, actualReps: existing.completed ? undefined : actual, durationSec: existing.completed ? undefined : duration, qualityReps: existing.completed ? undefined : (isDuration ? undefined : cameraResult?.goodReps ?? actual), formScore: existing.completed ? undefined : cameraResult?.score, feedback: existing.completed ? undefined : cameraResult?.feedback, completed: !existing.completed, completedAt: existing.completed ? undefined : new Date().toISOString() });
      const next = await getSession(session.id ?? 0);
      setSession(next);
      if (!existing.completed && settings?.hapticsEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (!existing.completed) {
        const flatIndex = item.sets.findIndex((set) => set.setNumber === setNumber);
        const hasNext = flatIndex < item.sets.length - 1 || activeIndex < (session.exercises.length - 1);
        if (hasNext) {
          const rest = item.restSeconds;
          setRestUntil(currentTimeMs() + rest * 1000);
          setRemaining(rest);
        }
      }
    } catch {
      Alert.alert('Could not save', 'Your set was not saved. Please try again.');
    } finally {
      setSavingSet(false);
    }
  }

  function beginFormCheck(): void {
    if (!activeExercise) return;
    const nextSet = activeExercise.sets.find((set) => !set.completed)?.setNumber ?? 1;
    router.push({ pathname: '/camera', params: { exerciseId: activeExercise.exerciseId, setNumber: String(nextSet), returnTo: `/workout/${sessionId}` } });
  }

  async function finish(): Promise<void> {
    if (!session?.id) return;
    const remainingSets = totalSets - completedSets;
    if (remainingSets > 0) {
      Alert.alert('Finish this workout?', `${remainingSets} set${remainingSets === 1 ? '' : 's'} still need a result. You can finish now and keep the session saved.`, [{ text: 'Keep training', style: 'cancel' }, { text: 'Finish workout', onPress: () => void confirmFinish() }]);
      return;
    }
    await confirmFinish();
  }

  async function confirmFinish(): Promise<void> {
    if (!session?.id) return;
    setFinishing(true);
    try {
      await completeSession(session.id, notes.trim() || undefined);
      router.replace('/(tabs)/progress');
    } catch {
      Alert.alert('Could not finish', 'Your local session could not be saved. Please try again.');
    } finally {
      setFinishing(false);
    }
  }

  if (loading || !session) return <Screen><View style={styles.loading}><AppText color={colors.textSecondary}>Opening your workout…</AppText></View></Screen>;
  if (!activeExercise) return <Screen><AppText color={colors.textSecondary}>This local session has no exercises.</AppText></Screen>;
  const exercise = EXERCISE_BY_ID[activeExercise.exerciseId];
  if (!exercise) return <Screen><AppText>Exercise data unavailable.</AppText></Screen>;

  return <Screen><View style={styles.topBar}><IconButton name="close" label="Close workout" onPress={() => Alert.alert('Leave workout?', 'Your completed sets are saved locally. You can return to this session from the plan.', [{ text: 'Stay', style: 'cancel' }, { text: 'Leave', onPress: () => router.back() }])} /><View style={styles.topCenter}><AppText variant="label">ACTIVE SESSION</AppText><AppText variant="caption" color={colors.textSecondary}>{session.title}</AppText></View><IconButton name="ellipsis-horizontal" label="Workout options" onPress={() => Alert.alert('Workout options', 'Your notes are saved locally when you finish the session.')} /></View><View style={styles.progressHeader}><View style={styles.progressCopy}><AppText variant="caption" color={colors.textSecondary}>{completedSets} OF {totalSets} SETS</AppText><AppText variant="title">{Math.round(progress * 100)}%</AppText></View><View style={styles.timerPill}><Ionicons name="time-outline" size={15} color={colors.lime} /><AppText variant="label" color={colors.lime}>{formatDuration(elapsedSeconds)}</AppText></View></View><ProgressBar value={progress} height={8} /><View style={styles.exerciseNav}><Pressable accessibilityRole="button" accessibilityLabel="Previous exercise" accessibilityState={{ disabled: activeIndex === 0 }} disabled={activeIndex === 0} onPress={() => setActiveIndex((index) => Math.max(0, index - 1))} style={styles.navArrow}><View pointerEvents="none" style={styles.navArrowFill} /><Ionicons name="chevron-back" size={20} color={activeIndex === 0 ? colors.border : colors.text} /></Pressable><View style={styles.exerciseNavCopy}><AppText variant="caption" color={colors.lime}>EXERCISE {activeIndex + 1} OF {session.exercises.length}</AppText><AppText variant="heading" numberOfLines={1}>{exercise.name}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Next exercise" accessibilityState={{ disabled: activeIndex === session.exercises.length - 1 }} disabled={activeIndex === session.exercises.length - 1} onPress={() => setActiveIndex((index) => Math.min(session.exercises.length - 1, index + 1))} style={styles.navArrow}><View pointerEvents="none" style={styles.navArrowFill} /><Ionicons name="chevron-forward" size={20} color={activeIndex === session.exercises.length - 1 ? colors.border : colors.text} /></Pressable></View><Card style={styles.exerciseCard}><View style={styles.exerciseHeader}><View style={styles.exerciseBadge}><Ionicons name={exercise.category === 'core' ? 'body-outline' : 'barbell-outline'} size={20} color={colors.lime} /></View><View style={styles.exerciseHeaderCopy}><AppText variant="subheading">{exercise.name}</AppText><AppText variant="caption" color={colors.textSecondary}>{activeExercise.plannedSets} sets · {activeExercise.durationSec ? `${activeExercise.durationSec}s hold` : `${activeExercise.targetRepMin}–${activeExercise.targetRepMax} reps`} · {activeExercise.restSeconds}s rest</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="View exercise details" onPress={() => router.push({ pathname: '/exercise', params: { exerciseId: exercise.id } })}><Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} /></Pressable></View><Divider /><View style={styles.setsHeader}><AppText variant="label" color={colors.textSecondary}>SET</AppText><AppText variant="label" color={colors.textSecondary}>TARGET</AppText><AppText variant="label" color={colors.textSecondary}>YOUR RESULT</AppText><View style={styles.checkSpace} /></View>{activeExercise.sets.map((set) => { const key = `${activeExercise.exerciseId}_${set.setNumber}`; return <View key={set.setNumber} style={[styles.setRow, set.completed && styles.setRowComplete]}><View style={styles.setNumber}><AppText variant="subheading" color={set.completed ? colors.background : colors.text}>{set.setNumber}</AppText></View><AppText variant="body" color={set.completed ? colors.textSecondary : colors.text}>{activeExercise.durationSec ? `${activeExercise.durationSec}s` : `${set.targetRepMin}–${set.targetRepMax}`}</AppText><TextInput accessibilityLabel={`Result for set ${set.setNumber}`} placeholder={activeExercise.durationSec ? 'sec' : 'reps'} placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={values[key] ?? (activeExercise.durationSec ? set.durationSec?.toString() ?? '' : set.actualReps?.toString() ?? '')} onChangeText={(value) => updateValue(key, value)} editable={!set.completed} style={[styles.setInput, set.completed && styles.setInputComplete]} /><View style={styles.checkPress}><CheckCircle checked={set.completed} onPress={() => void toggleSet(activeExercise, set.setNumber)} label={set.completed ? `Uncomplete set ${set.setNumber}` : `Complete set ${set.setNumber}`} /></View></View>; })}<View style={styles.formRow}><SecondaryButton title="Form check" onPress={beginFormCheck} icon="camera-outline" style={styles.formButton} /><AppText variant="caption" color={colors.textMuted} style={styles.formHint}>{exercise.cameraSupported ? 'Optional · on-device only' : 'Coming soon for this movement'}</AppText></View></Card><View style={styles.tipRow}><Ionicons name="bulb-outline" size={17} color={colors.amber} /><AppText variant="caption" color={colors.textSecondary} style={styles.tipText}>{exercise.cues[0] ?? 'Move slowly and keep your form comfortable.'}</AppText></View>{restUntil && remaining > 0 ? <Card style={styles.restCard}><View style={styles.restIcon}><Ionicons name="timer-outline" size={20} color={colors.lime} /></View><View style={styles.restCopy}><AppText variant="caption" color={colors.lime}>RECOVERY TIMER</AppText><AppText variant="number">{formatDuration(remaining)}</AppText><AppText variant="caption" color={colors.textSecondary}>Breathe. Next set when ready.</AppText></View><TextButton title="Skip" onPress={() => { setRestUntil(null); setRemaining(0); }} color={colors.textSecondary} /></Card> : null}<InputField label="Session notes (optional)" placeholder="How did it feel? Anything to remember?" value={notes} onChangeText={setNotes} multiline /><PrimaryButton title="Finish workout" onPress={() => void finish()} loading={finishing || savingSet} icon="checkmark" style={styles.finishButton} /><AppText variant="caption" color={colors.textMuted} style={styles.safety}>Stop if an exercise causes pain. Use stable equipment and progress gradually.</AppText></Screen>;
}

const styles = StyleSheet.create({
  loading: { minHeight: 400, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  topCenter: { alignItems: 'center', gap: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  progressCopy: { gap: 3 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.limeDark },
  exerciseNav: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxxl, marginBottom: spacing.lg, gap: spacing.sm },
  navArrow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  navArrowFill: { ...StyleSheet.absoluteFill, borderRadius: 24, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  exerciseNavCopy: { flex: 1, alignItems: 'center', gap: 3 },
  exerciseCard: { padding: spacing.lg, gap: spacing.md },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exerciseBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  exerciseHeaderCopy: { flex: 1, gap: 3 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, gap: spacing.md },
  checkSpace: { width: 44, height: 44 },
  setRow: { minHeight: 58, borderRadius: radii.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised },
  setRowComplete: { backgroundColor: colors.mintDark },
  setNumber: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  setInput: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16, fontWeight: '700' },
  setInputComplete: { color: colors.mint },
  checkPress: { padding: 3 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  formButton: { flex: 1, minHeight: 44 },
  formHint: { flex: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.sm, marginTop: spacing.md },
  tipText: { flex: 1 },
  restCard: { marginTop: spacing.lg, backgroundColor: colors.limeDark, borderColor: '#385326', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#385326', alignItems: 'center', justifyContent: 'center' },
  restCopy: { flex: 1, gap: 1 },
  finishButton: { marginTop: spacing.xl },
  safety: { textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
});
