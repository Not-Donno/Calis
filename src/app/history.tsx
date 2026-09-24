import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Divider, IconButton, ProgressBar, Screen, SectionHeader, Tag } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getNutritionHistory, getRecentSessions } from '@/db/repositories';
import { EXERCISE_BY_ID } from '@/data/program';
import type { WorkoutSession } from '@/types';
import { formatDuration, formatNumber } from '@/utils/format';

export default function HistoryScreen(): React.JSX.Element {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [nutrition, setNutrition] = useState<{ date: string; totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number } }[]>([]);
  const load = useCallback(async () => { const [a, b] = await Promise.all([getRecentSessions(50), getNutritionHistory(30)]); setSessions(a); setNutrition(b); }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Screen><View style={styles.header}><IconButton name="arrow-back" label="Go back" onPress={() => router.back()} /><View style={styles.headerCopy}><AppText variant="caption" color={colors.lime}>YOUR RECORD</AppText><AppText variant="title">History</AppText></View><View style={styles.spacer} /></View><SectionHeader title="Workout sessions" /><View style={styles.list}>{sessions.length === 0 ? <Card><AppText color={colors.textSecondary}>Completed workouts will appear here, stored locally on your device.</AppText></Card> : sessions.map((session, index) => { const completed = session.exercises.flatMap((item) => item.sets).filter((set) => set.completed).length; const total = session.exercises.reduce((sum, item) => sum + item.plannedSets, 0); return <Card key={session.id} style={styles.sessionCard}><View style={styles.sessionHeader}><View style={styles.sessionIcon}><Ionicons name="barbell-outline" size={19} color={colors.lime} /></View><View style={styles.sessionCopy}><AppText variant="subheading">{session.title}</AppText><AppText variant="caption" color={colors.textSecondary}>{new Date(session.startedAt).toLocaleDateString()} · {formatDuration(session.durationSeconds ?? 0)}</AppText></View><Tag label={`${completed}/${total}`} color={colors.mint} background={colors.mintDark} icon="checkmark-circle-outline" /></View><Divider /><View style={styles.exerciseList}>{session.exercises.map((item) => { const exercise = EXERCISE_BY_ID[item.exerciseId]; const done = item.sets.filter((set) => set.completed).length; return <View key={item.exerciseId} style={styles.exerciseLine}><AppText variant="caption" color={colors.textSecondary}>{exercise?.shortName ?? item.exerciseId}</AppText><AppText variant="caption" color={done === item.plannedSets ? colors.mint : colors.textMuted}>{done}/{item.plannedSets}</AppText></View>; })}</View></Card>; })}</View><SectionHeader title="Nutrition log" /><Card style={styles.nutritionCard}>{nutrition.length === 0 ? <AppText color={colors.textSecondary}>Nutrition history will appear here after your first logged meal.</AppText> : nutrition.slice().reverse().map((item, index) => <View key={item.date} style={[styles.nutritionRow, index < nutrition.length - 1 && styles.nutritionBorder]}><View style={styles.nutritionDate}><AppText variant="label">{item.date === new Date().toISOString().slice(0, 10) ? 'Today' : item.date.slice(5)}</AppText></View><View style={styles.nutritionProgress}><ProgressBar value={item.totals.calories / 2200} color={colors.lime} height={6} /><AppText variant="caption" color={colors.textMuted}>{Math.round(item.totals.protein)}g protein · {Math.round(item.totals.carbs)}g carbs · {Math.round(item.totals.fat)}g fat</AppText></View><AppText variant="label">{formatNumber(item.totals.calories)}</AppText></View>)}</Card><View style={styles.privacy}><Ionicons name="phone-portrait-outline" size={15} color={colors.mint} /><AppText variant="caption" color={colors.textMuted}>History is local. Export a backup if you want a copy.</AppText></View></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  headerCopy: { alignItems: 'center', gap: 2 },
  spacer: { width: 42 },
  list: { gap: spacing.md },
  sessionCard: { gap: spacing.md },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sessionIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1, gap: 3 },
  exerciseList: { gap: spacing.sm },
  exerciseLine: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionCard: { gap: spacing.md },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nutritionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  nutritionDate: { width: 48 },
  nutritionProgress: { flex: 1, gap: 5 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: spacing.xxl },
});
