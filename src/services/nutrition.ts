import type { ActivityLevel, Goal, MacroTotals, NutritionTargets, UserProfile } from '@/types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  maintain: 0,
  gain: 250,
  lose: -250,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Mostly seated',
  light: 'Lightly active',
  moderate: 'Active most days',
  active: 'Very active',
};

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: 'Maintain weight',
  gain: 'Build muscle',
  lose: 'Lose body fat',
};

export function calculateNutritionTargets(profile: Pick<UserProfile, 'age' | 'heightCm' | 'weightKg' | 'activityLevel' | 'goal' | 'trainingFrequency'>): NutritionTargets {
  // Mifflin–St Jeor is an estimate, not a medical prescription.
  // A sex-neutral midpoint keeps the estimate useful without requiring a
  // sensitive demographic field. Users can adjust the target in Settings.
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  const trainingAdjustment = Math.min(180, Math.max(0, (profile.trainingFrequency - 2) * 45));
  const rawCalories = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel] + trainingAdjustment + GOAL_ADJUSTMENTS[profile.goal];
  const calories = Math.max(1200, Math.round(rawCalories / 10) * 10);
  const protein = Math.max(40, Math.round((profile.goal === 'lose' ? 1.8 : profile.goal === 'gain' ? 1.7 : 1.6) * profile.weightKg));
  const fat = Math.max(35, Math.round((calories * 0.27) / 9));
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: Math.max(20, Math.round((calories / 1000) * 14)),
    updatedAt: new Date().toISOString(),
  };
}

export function emptyMacros(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function scaleMacros(macros: MacroTotals, servings: number): MacroTotals {
  return {
    calories: Math.round(macros.calories * servings),
    protein: Math.round((macros.protein * servings) * 10) / 10,
    carbs: Math.round((macros.carbs * servings) * 10) / 10,
    fat: Math.round((macros.fat * servings) * 10) / 10,
    fiber: Math.round((macros.fiber * servings) * 10) / 10,
  };
}

export function validateProfile(input: { age: string; heightCm: string; weightKg: string; trainingFrequency: string }): Partial<UserProfile> {
  const age = Number(input.age);
  const heightCm = Number(input.heightCm);
  const weightKg = Number(input.weightKg);
  const trainingFrequency = Number(input.trainingFrequency);
  const errors: Partial<UserProfile> = {};
  if (!Number.isInteger(age) || age < 13 || age > 100) errors.age = age;
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) errors.heightCm = heightCm;
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) errors.weightKg = weightKg;
  if (!Number.isInteger(trainingFrequency) || trainingFrequency < 0 || trainingFrequency > 7) errors.trainingFrequency = trainingFrequency;
  return errors;
}
