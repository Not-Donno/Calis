import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, LoadingState, PrimaryButton, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { formatDateKey } from '@/data/program';
import { deleteFoodLog, getFoodLogs, getNutritionHistory } from '@/db/repositories';
import { useAppData } from '@/hooks/useAppData';
import { emptyMacros } from '@/services/nutrition';
import type { FoodLog, MacroTotals, MealType } from '@/types';
import { formatNumber } from '@/utils/format';

const meals: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function NutritionScreen(): React.JSX.Element {
  const { targets } = useAppData();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [history, setHistory] = useState<{ date: string; totals: MacroTotals }[]>([]);
  const [loading, setLoading] = useState(true);
  const date = formatDateKey(new Date());

  const load = useCallback(async () => {
    try {
      setLogs(await getFoodLogs(date));
      setHistory(await getNutritionHistory(7));
    } finally {
      setLoading(false);
    }
  }, [date]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totals = useMemo(() => logs.reduce((sum, log) => ({ calories: sum.calories + log.calories, protein: sum.protein + log.protein, carbs: sum.carbs + log.carbs, fat: sum.fat + log.fat, fiber: sum.fiber + log.fiber }), emptyMacros()), [logs]);
  const calorieGoal = targets?.calories ?? 2200;
  const remainingCalories = calorieGoal - totals.calories;

  if (loading) return <Screen><LoadingState label="Loading today’s nutrition…" /></Screen>;

  async function removeLog(log: FoodLog): Promise<void> {
    Alert.alert('Remove this food?', log.foodName, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void (async () => { await deleteFoodLog(log.id ?? 0); await load(); })() }]);
  }

  return <Screen><View style={styles.header}><View><AppText variant="caption" color={colors.lime}>NOURISH</AppText><AppText variant="title">Nutrition</AppText></View><IconButton name="settings-outline" label="Nutrition settings" onPress={() => router.push('/(tabs)/settings')} /></View><Card style={styles.energyCard}><View style={styles.energyTop}><View><AppText variant="caption" color={colors.textSecondary}>TODAY’S ENERGY</AppText><AppText variant="number">{formatNumber(totals.calories)} <AppText variant="body" color={colors.textMuted}>/ {formatNumber(calorieGoal)} kcal</AppText></AppText></View><View style={styles.remaining}><AppText variant="caption" color={remainingCalories < 0 ? colors.amber : colors.mint}>{remainingCalories >= 0 ? 'REMAINING' : 'OVER TARGET'}</AppText><AppText variant="subheading" color={remainingCalories < 0 ? colors.amber : colors.mint}>{formatNumber(Math.abs(remainingCalories))} kcal</AppText></View></View><ProgressBar value={calorieGoal ? totals.calories / calorieGoal : 0} color={remainingCalories < 0 ? colors.amber : colors.lime} height={9} style={styles.energyBar} /><View style={styles.macroRow}><MacroProgress label="Protein" value={totals.protein} goal={targets?.protein ?? 120} color={colors.mint} /><MacroProgress label="Carbs" value={totals.carbs} goal={targets?.carbs ?? 275} color={colors.amber} /><MacroProgress label="Fat" value={totals.fat} goal={targets?.fat ?? 73} color={colors.coral} /></View><View style={styles.estimateNote}><Ionicons name="information-circle-outline" size={15} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted} style={styles.noteCopy}>Targets are estimates based on your profile, not medical prescriptions.</AppText></View></Card><PrimaryButton title="Log food" icon="add" onPress={() => router.push({ pathname: '/nutrition/log', params: { meal: 'Breakfast' } })} style={styles.logButton} /><SectionHeader title="Meals today" action="Custom food" onAction={() => router.push({ pathname: '/nutrition/log', params: { custom: '1' } })} />{loading ? <Card><AppText color={colors.textSecondary}>Loading local food log…</AppText></Card> : <View style={styles.meals}>{meals.map((meal) => { const mealLogs = logs.filter((log) => log.meal === meal); const mealTotal = mealLogs.reduce((sum, log) => sum + log.calories, 0); return <Card key={meal} style={styles.mealCard}><View style={styles.mealHeader}><View style={styles.mealTitle}><View style={[styles.mealIcon, { backgroundColor: meal === 'Breakfast' ? colors.amber + '22' : meal === 'Lunch' ? colors.mint + '22' : meal === 'Dinner' ? colors.blue + '22' : colors.coral + '22' }]}><Ionicons name={meal === 'Breakfast' ? 'sunny-outline' : meal === 'Lunch' ? 'leaf-outline' : meal === 'Dinner' ? 'moon-outline' : 'cafe-outline'} size={17} color={meal === 'Breakfast' ? colors.amber : meal === 'Lunch' ? colors.mint : meal === 'Dinner' ? colors.blue : colors.coral} /></View><View><AppText variant="subheading">{meal}</AppText><AppText variant="caption" color={colors.textMuted}>{mealLogs.length ? `${mealLogs.length} item${mealLogs.length === 1 ? '' : 's'}` : 'Nothing logged yet'}</AppText></View></View><View style={styles.mealCalories}><AppText variant="subheading">{Math.round(mealTotal)}</AppText><AppText variant="caption" color={colors.textMuted}>kcal</AppText></View></View>{mealLogs.length > 0 ? <View style={styles.foodList}>{mealLogs.map((log) => <View key={log.id} style={styles.foodRow}><View style={styles.foodCopy}><AppText variant="body" numberOfLines={1}>{log.foodName}</AppText><AppText variant="caption" color={colors.textMuted}>{log.servings} serving{log.servings === 1 ? '' : 's'} · {Math.round(log.protein)}g protein</AppText></View><AppText variant="label">{Math.round(log.calories)} kcal</AppText><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${log.foodName}`} hitSlop={8} onPress={() => void removeLog(log)}><Ionicons name="close-circle-outline" size={19} color={colors.textMuted} /></Pressable></View>)}</View> : null}<Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/nutrition/log', params: { meal } })} style={styles.addMeal}><Ionicons name="add" size={17} color={colors.lime} /><AppText variant="label" color={colors.lime}>Add to {meal.toLowerCase()}</AppText></Pressable></Card>; })}</View>}<SectionHeader title="Recent days" action="Nutrition history" onAction={() => router.push('/history')} /><Card style={styles.historyCard}>{history.length === 0 ? <AppText color={colors.textSecondary}>Your nutrition history will appear after you log a meal.</AppText> : history.slice(-7).reverse().map((item, index) => <View key={item.date} style={[styles.historyRow, index < history.length - 1 && styles.historyBorder]}><AppText variant="caption" color={colors.textSecondary}>{item.date === date ? 'Today' : item.date.slice(5)}</AppText><View style={styles.historyBar}><ProgressBar value={item.totals.calories / calorieGoal} color={colors.mint} height={5} /></View><AppText variant="label">{formatNumber(item.totals.calories)} kcal</AppText></View>)}</Card><View style={styles.profileHint}><Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted}>Your food log and nutrition targets are stored only on this device.</AppText></View></Screen>;
}

function MacroProgress({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }): React.JSX.Element {
  const difference = goal - value;
  const over = difference < 0;
  return <View style={styles.macroProgress}><View style={styles.macroProgressTop}><AppText variant="caption" color={colors.textSecondary}>{label}</AppText><AppText variant="caption" color={colors.text}>{Math.round(value)}g</AppText></View><ProgressBar value={goal ? value / goal : 0} color={color} height={5} /><AppText variant="caption" color={over ? colors.amber : colors.textMuted} style={styles.goalText}>{over ? `${Math.abs(Math.round(difference))}g over goal` : `${Math.round(difference)}g left`} · goal {goal}g</AppText></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxl },
  energyCard: { gap: spacing.lg, backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong },
  energyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  remaining: { alignItems: 'flex-end', gap: 3, padding: spacing.sm, borderRadius: 14, backgroundColor: colors.mintDark },
  energyBar: { marginTop: -7 },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macroProgress: { flex: 1, gap: 7, padding: spacing.sm, borderRadius: 14, backgroundColor: 'rgba(11,17,15,0.32)' },
  macroProgressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  goalText: { marginTop: -2 },
  estimateNote: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  noteCopy: { flex: 1 },
  logButton: { marginTop: spacing.lg },
  meals: { gap: spacing.md },
  mealCard: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surfaceRaised },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mealIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealCalories: { alignItems: 'flex-end' },
  foodList: { gap: spacing.md },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 42 },
  foodCopy: { flex: 1, gap: 2 },
  addMeal: { minHeight: 44, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyCard: { gap: spacing.md },
  historyRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  historyBar: { flex: 1 },
  profileHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xxl },
});
