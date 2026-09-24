import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Divider, IconButton, InputField, PrimaryButton, Screen, Tag } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { formatDateKey } from '@/data/program';
import { addCustomFood, addFoodLog, getFoods } from '@/db/repositories';
import { scaleMacros } from '@/services/nutrition';
import type { FoodItem, MealType } from '@/types';
import { formatNumber } from '@/utils/format';

const mealOptions: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function FoodLogScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ meal?: string; custom?: string }>();
  const [meal, setMeal] = useState<MealType>(mealOptions.includes(params.meal as MealType) ? params.meal as MealType : 'Breakfast');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState('1');
  const [showCustom, setShowCustom] = useState(params.custom === '1');
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('1 serving');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customError, setCustomError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void (async () => setFoods(await getFoods('')))(); }, []);
  useEffect(() => { void (async () => { if (query.trim()) setFoods(await getFoods(query)); else setFoods(await getFoods('')); })(); }, [query]);

  const scaled = useMemo(() => selected ? scaleMacros({ calories: selected.calories, protein: selected.protein, carbs: selected.carbs, fat: selected.fat, fiber: selected.fiber }, Math.max(0.1, Number(servings) || 1)) : null, [selected, servings]);

  async function saveSelected(): Promise<void> {
    if (!selected || !scaled) return;
    setSaving(true);
    try {
      await addFoodLog({ date: formatDateKey(new Date()), meal, foodId: selected.id, foodName: selected.name, servings: Math.max(0.1, Number(servings) || 1), ...scaled });
      router.back();
    } catch {
      Alert.alert('Could not save', 'Your food log could not be saved locally. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveCustom(): Promise<void> {
    const calories = Number(customCalories);
    const protein = Number(customProtein);
    const carbs = Number(customCarbs);
    const fat = Number(customFat);
    if (!customName.trim() || !Number.isFinite(calories) || calories < 0 || !Number.isFinite(protein) || protein < 0 || !Number.isFinite(carbs) || carbs < 0 || !Number.isFinite(fat) || fat < 0) {
      setCustomError('Add a name and non-negative nutrition values.');
      return;
    }
    setSaving(true);
    try {
      const food = await addCustomFood({ name: customName, category: 'Custom', servingLabel: customServing, servingGrams: 0, calories, protein, carbs, fat, fiber: 0 });
      await addFoodLog({ date: formatDateKey(new Date()), meal, foodId: food.id, foodName: food.name, servings: 1, calories, protein, carbs, fat, fiber: 0 });
      router.back();
    } catch {
      setCustomError('Could not save this custom food. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <Screen><View style={styles.header}><IconButton name="arrow-back" label="Close food logger" onPress={() => router.back()} /><View style={styles.headerCopy}><AppText variant="label">FOOD LOGGER</AppText><AppText variant="caption" color={colors.textSecondary}>Stored on this device</AppText></View><View style={styles.headerSpacer} /></View><AppText variant="title">Add something nourishing</AppText><AppText color={colors.textSecondary} style={styles.intro}>Search the bundled database or create a food that belongs to your kitchen.</AppText><View style={styles.mealTabs}>{mealOptions.map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: meal === option }} onPress={() => setMeal(option)} style={[styles.mealTab, meal === option && styles.mealTabActive]}><View pointerEvents="none" style={[styles.mealTabFill, meal === option && styles.mealTabActive]} /><AppText variant="label" color={meal === option ? colors.background : colors.textSecondary}>{option}</AppText></Pressable>)}</View>{showCustom ? <Card style={styles.customCard}><View style={styles.customHeader}><View><AppText variant="heading">Create custom food</AppText><AppText variant="caption" color={colors.textSecondary}>Values are per serving.</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Close custom food form" hitSlop={10} onPress={() => setShowCustom(false)} style={styles.closeCustom}><Ionicons name="close" size={21} color={colors.textSecondary} /></Pressable></View><InputField label="Food name" placeholder="Dal Bhat" value={customName} onChangeText={setCustomName} /><InputField label="Serving label" placeholder="1 plate" value={customServing} onChangeText={setCustomServing} /><View style={styles.nutritionInputs}><InputField label="Calories" placeholder="450" keyboardType="decimal-pad" value={customCalories} onChangeText={setCustomCalories} style={styles.nutritionInput} /><InputField label="Protein (g)" placeholder="20" keyboardType="decimal-pad" value={customProtein} onChangeText={setCustomProtein} style={styles.nutritionInput} /><InputField label="Carbs (g)" placeholder="60" keyboardType="decimal-pad" value={customCarbs} onChangeText={setCustomCarbs} style={styles.nutritionInput} /><InputField label="Fat (g)" placeholder="12" keyboardType="decimal-pad" value={customFat} onChangeText={setCustomFat} style={styles.nutritionInput} /></View>{customError ? <AppText variant="caption" color={colors.coral}>{customError}</AppText> : null}<PrimaryButton title="Save custom food" onPress={() => void saveCustom()} loading={saving} icon="checkmark" /></Card> : <><View style={styles.searchWrap}><Ionicons name="search" size={19} color={colors.textMuted} /><InputField placeholder="Search rice, dal, eggs, roti…" value={query} onChangeText={setQuery} style={styles.searchInput} /></View><View style={styles.resultsHeader}><AppText variant="label" color={colors.textSecondary}>{query ? 'MATCHES' : 'COMMON FOODS'}</AppText><Tag label={`${foods.length} LOCAL`} color={colors.mint} background={colors.mintDark} icon="cloud-offline-outline" /></View><Card style={styles.foodList}>{foods.slice(0, query ? 30 : 12).map((food, index) => <Pressable key={food.id} accessibilityRole="button" onPress={() => { setSelected(food); setServings('1'); }} style={[styles.foodRow, index < Math.min(foods.length, query ? 30 : 12) - 1 && styles.foodBorder]}><View style={styles.foodIcon}><Ionicons name={food.category === 'Protein' ? 'barbell-outline' : food.category === 'Fruits' ? 'leaf-outline' : 'restaurant-outline'} size={17} color={colors.lime} /></View><View style={styles.foodCopy}><AppText variant="subheading">{food.name}</AppText><AppText variant="caption" color={colors.textMuted}>{food.servingLabel} · {food.calories} kcal · {food.protein}g protein</AppText></View><Ionicons name="add-circle-outline" size={22} color={colors.lime} /></Pressable>)}{foods.length === 0 ? <AppText color={colors.textSecondary} style={styles.noResults}>No match. Create a custom food instead.</AppText> : null}</Card><Pressable accessibilityRole="button" onPress={() => setShowCustom(true)} style={styles.customLink}><Ionicons name="add-circle-outline" size={18} color={colors.lime} /><AppText variant="label" color={colors.lime}>Create a custom food</AppText></Pressable></>}{selected && scaled ? <Card style={styles.selectedCard}><View style={styles.selectedTop}><View style={styles.foodIconLarge}><Ionicons name="checkmark" size={20} color={colors.background} /></View><View style={styles.foodCopy}><AppText variant="subheading">{selected.name}</AppText><AppText variant="caption" color={colors.textMuted}>{selected.servingLabel}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Remove selected food" onPress={() => setSelected(null)}><Ionicons name="close-circle" size={22} color={colors.textMuted} /></Pressable></View><Divider /><AppText variant="label" color={colors.textSecondary}>SERVINGS</AppText><View style={styles.stepper}><Pressable accessibilityRole="button" accessibilityLabel="Decrease servings" onPress={() => setServings((value) => String(Math.max(0.5, (Number(value) || 1) - 0.5)))} style={styles.stepButton}><Ionicons name="remove" size={19} color={colors.text} /></Pressable><AppText variant="title">{Number(servings || 1).toFixed(1)}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Increase servings" onPress={() => setServings((value) => String((Number(value) || 1) + 0.5))} style={styles.stepButton}><Ionicons name="add" size={19} color={colors.text} /></Pressable></View><View style={styles.selectedMacros}><View><AppText variant="caption" color={colors.textSecondary}>CALORIES</AppText><AppText variant="subheading">{formatNumber(scaled.calories)}</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>PROTEIN</AppText><AppText variant="subheading">{scaled.protein}g</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>CARBS</AppText><AppText variant="subheading">{scaled.carbs}g</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>FAT</AppText><AppText variant="subheading">{scaled.fat}g</AppText></View></View><PrimaryButton title={`Add to ${meal.toLowerCase()}`} onPress={() => void saveSelected()} loading={saving} icon="add" style={styles.addButton} /></Card> : null}</Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxl },
  headerCopy: { alignItems: 'center', gap: 2 },
  headerSpacer: { width: 42 },
  intro: { marginTop: spacing.sm, marginBottom: spacing.xl },
  mealTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.md, padding: 4, marginBottom: spacing.lg, gap: 2 },
  mealTab: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mealTabFill: { ...StyleSheet.absoluteFill, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  mealTabActive: { backgroundColor: colors.lime },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  searchInput: { flex: 1 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  foodList: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  foodRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  foodBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  foodIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  foodIconLarge: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  foodCopy: { flex: 1, gap: 3 },
  noResults: { paddingVertical: spacing.lg, textAlign: 'center' },
  customLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  selectedCard: { marginTop: spacing.xl, borderColor: '#385326', backgroundColor: colors.limeDark, gap: spacing.lg },
  selectedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.md, padding: 7 },
  stepButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  selectedMacros: { flexDirection: 'row', justifyContent: 'space-between' },
  addButton: { minHeight: 48 },
  customCard: { gap: spacing.lg },
  closeCustom: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nutritionInputs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  nutritionInput: { width: '47%' },
});
