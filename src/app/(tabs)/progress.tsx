import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, ProgressBar, Screen, SectionHeader, Tag } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAppData } from '@/hooks/useAppData';
import { getMeasurements, getRecentSessions, getWorkoutHistory } from '@/db/repositories';
import { evaluateProgression, progressionLabel } from '@/services/progression';
import { EXERCISES } from '@/data/program';
import type { WorkoutSession } from '@/types';
import { formatNumber, formatWeight } from '@/utils/format';

export default function ProgressScreen(): React.JSX.Element {
  const { settings } = useAppData();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWorkoutHistory>>>([]);
  const [measurements, setMeasurements] = useState<Awaited<ReturnType<typeof getMeasurements>>>([]);
  const load = useCallback(async () => { const [a, b, c] = await Promise.all([getRecentSessions(30), getWorkoutHistory(), getMeasurements()]); setSessions(a); setHistory(b); setMeasurements(c); }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const completedSets = history.reduce((sum, item) => sum + item.completedSets, 0);
  const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0) / 60);
  const week = history.slice(0, 7);
  const maxWeekSets = Math.max(1, ...week.map((item) => item.completedSets));
  const featured = EXERCISES.filter((exercise) => ['incline-push-up', 'bodyweight-squat', 'assisted-chin-up', 'knee-plank'].includes(exercise.id));
  const latestWeight = measurements[0]?.weightKg;
  const firstWeight = measurements[measurements.length - 1]?.weightKg;
  const weightChange = latestWeight !== undefined && firstWeight !== undefined ? latestWeight - firstWeight : undefined;
  const weightChangeLabel = weightChange === undefined ? undefined : `${weightChange >= 0 ? '+' : '-'}${formatWeight(Math.abs(weightChange), settings?.units)}`;
  const grouped = useMemo(() => featured.map((exercise) => ({ exercise, sessions: sessions.map((session) => session.exercises).filter((items) => items.some((item) => item.exerciseId === exercise.id)) })), [featured, sessions]);

  return <Screen><View style={styles.header}><View><AppText variant="caption" color={colors.lime}>YOUR MOMENTUM</AppText><AppText variant="title">Progress</AppText></View><IconButton name="calendar-outline" label="Workout history" onPress={() => router.push('/history')} /></View><View style={styles.statGrid}><Stat label="Sessions" value={String(sessions.length)} icon="barbell-outline" color={colors.lime} /><Stat label="Completed sets" value={formatNumber(completedSets)} icon="checkmark-circle-outline" color={colors.mint} /><Stat label="Training time" value={`${totalMinutes}m`} icon="time-outline" color={colors.blue} /></View><Card style={styles.chartCard}><View style={styles.cardHeader}><View><AppText variant="heading">Training rhythm</AppText><AppText variant="caption" color={colors.textSecondary}>Completed sets · last 7 sessions</AppText></View><Tag label="LOCAL" color={colors.mint} background={colors.mintDark} icon="lock-closed-outline" /></View><View style={styles.chart}>{week.length === 0 ? <View style={styles.emptyChart}><Ionicons name="bar-chart-outline" size={25} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted}>Complete a workout to see your rhythm.</AppText></View> : week.map((item, index) => <View key={`${item.date}-${index}`} style={styles.barColumn}><View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(8, (item.completedSets / maxWeekSets) * 100)}%`, backgroundColor: index === 0 ? colors.lime : '#536B3B' }]} /></View><AppText variant="caption" color={index === 0 ? colors.lime : colors.textMuted}>{item.date.slice(8)}</AppText></View>)}</View></Card><SectionHeader title="Exercise progress" action="See history" onAction={() => router.push('/history')} /><Card style={styles.progressList}>{grouped.map(({ exercise, sessions: exerciseSessions }, index) => { const recommendation = evaluateProgression(exercise, exerciseSessions); const last = exerciseSessions[0]?.find((item) => item.exerciseId === exercise.id); return <View key={exercise.id} style={[styles.progressRow, index < grouped.length - 1 && styles.rowBorder]}><View style={styles.exerciseIcon}><Ionicons name="fitness-outline" size={17} color={colors.lime} /></View><View style={styles.progressCopy}><AppText variant="subheading">{exercise.shortName}</AppText><AppText variant="caption" color={colors.textSecondary}>{last?.sets.filter((set) => set.completed).length ?? 0} sets last session · {recommendation.ready ? 'Ready to progress' : progressionLabel()}</AppText><ProgressBar value={Math.min(1, (last?.sets.filter((set) => set.completed).length ?? 0) / Math.max(1, last?.plannedSets ?? 1))} height={5} style={styles.miniBar} /></View><View style={styles.levelBadge}><AppText variant="label" color={recommendation.ready ? colors.lime : colors.textSecondary}>L{recommendation.ready ? Math.min(5, exercise.level + 1) : exercise.level}</AppText></View></View>; })}</Card><SectionHeader title="Body check-in" action="Add measurement" onAction={() => router.push('/measure')} /><Card style={styles.measurementCard}><View style={styles.measurementTop}><View><AppText variant="caption" color={colors.textSecondary}>CURRENT WEIGHT</AppText><AppText variant="title">{latestWeight ? formatWeight(latestWeight, settings?.units) : 'Not tracked'}</AppText></View>{weightChangeLabel ? <Tag label={weightChangeLabel} color={weightChange !== undefined && weightChange <= 0 ? colors.mint : colors.amber} background={weightChange !== undefined && weightChange <= 0 ? colors.mintDark : colors.surfaceSoft} icon="trending-down-outline" /> : null}</View><AppText variant="caption" color={colors.textMuted}>Body measurements are optional. Progress is not a score.</AppText></Card><Card style={styles.mindsetCard}><Ionicons name="sparkles-outline" size={21} color={colors.lime} /><View style={styles.mindsetCopy}><AppText variant="subheading">Consistency beats intensity</AppText><AppText variant="caption" color={colors.textSecondary}>Aim for repeatable, controlled sessions. Calis recommends harder variations only after a pattern of quality work.</AppText></View></Card></Screen>;
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }): React.JSX.Element {
  return <Card style={styles.stat}><View style={[styles.statIcon, { backgroundColor: `${color}22` }]}><Ionicons name={icon} size={17} color={color} /></View><AppText variant="number" style={styles.statValue}>{value}</AppText><AppText variant="caption" color={colors.textMuted}>{label.toUpperCase()}</AppText></Card>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxl },
  statGrid: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md, gap: 8, backgroundColor: colors.surfaceRaised },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, lineHeight: 29 },
  chartCard: { marginTop: spacing.lg, gap: spacing.xl, backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  chart: { height: 175, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: spacing.md },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  barTrack: { flex: 1, width: 26, borderRadius: 13, backgroundColor: colors.surfaceSoft, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 13 },
  emptyChart: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  progressList: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  progressRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  progressCopy: { flex: 1, gap: 3 },
  miniBar: { marginTop: 5 },
  levelBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  measurementCard: { gap: spacing.md, backgroundColor: colors.surfaceRaised },
  measurementTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mindsetCard: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.mintDark, borderColor: '#356A54' },
  mindsetCopy: { flex: 1, gap: 4 },
});
