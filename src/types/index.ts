export type Goal = 'maintain' | 'gain' | 'lose';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type UnitSystem = 'metric' | 'imperial';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'conditioning' | 'mobility';
export type CameraView = 'side' | 'front' | 'three-quarter';
export type ExerciseLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface UserProfile {
  id: number;
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  trainingFrequency: number;
  goal: Goal;
  unitSystem: UnitSystem;
  onboardedAt: string;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  updatedAt: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Exercise {
  id: string;
  name: string;
  shortName: string;
  category: ExerciseCategory;
  muscles: string[];
  equipment: string;
  instructions: string[];
  cues: string[];
  cameraView: CameraView;
  repMin?: number;
  repMax?: number;
  durationSec?: number;
  defaultSets: number;
  restSeconds: number;
  level: ExerciseLevel;
  nextLevelId?: string;
  cameraSupported: boolean;
  beginnerFriendly: boolean;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  durationSec?: number;
  restSeconds: number;
}

export interface WorkoutDay {
  dayOfWeek: number;
  key: string;
  title: string;
  subtitle: string;
  focus: string;
  durationMinutes: number;
  exercises: PlannedExercise[];
  warmup: string[];
  isRest: boolean;
  conditioning?: string[];
}

export interface SetLog {
  id?: number;
  sessionExerciseId?: number;
  exerciseId: string;
  setNumber: number;
  targetRepMin: number;
  targetRepMax: number;
  actualReps?: number;
  durationSec?: number;
  completed: boolean;
  qualityReps?: number;
  formScore?: number;
  feedback?: string;
  completedAt?: string;
}

export interface SessionExercise {
  id?: number;
  sessionId?: number;
  exerciseId: string;
  order: number;
  plannedSets: number;
  targetRepMin: number;
  targetRepMax: number;
  durationSec?: number;
  restSeconds: number;
  sets: SetLog[];
}

export interface WorkoutSession {
  id?: number;
  dayKey: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes?: string;
  exercises: SessionExercise[];
}

export interface FoodItem {
  id: string;
  name: string;
  localName?: string;
  category: string;
  servingLabel: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  isCustom?: boolean;
}

export interface FoodLog {
  id?: number;
  date: string;
  meal: MealType;
  foodId: string;
  foodName: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  createdAt: string;
}

export interface BodyMeasurement {
  id?: number;
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  notes?: string;
}

export interface AppSettings {
  units: UnitSystem;
  cameraPreferredView: CameraView;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  onboardingComplete: boolean;
}

export interface BackupPayload {
  format: 'calis-backup';
  version: 1;
  exportedAt: string;
  profile: UserProfile | null;
  settings: AppSettings;
  nutritionTargets: NutritionTargets | null;
  nutritionLogs: FoodLog[];
  customFoods: FoodItem[];
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  progress: Record<string, unknown>;
}

export interface ProgressionRecord {
  exerciseId: string;
  level: ExerciseLevel;
  qualitySessions: number;
  upperRangeSessions: number;
  lastRecommendedAt?: string;
}

export interface FormAnalysis {
  exerciseId: string;
  estimatedScore?: number;
  goodReps: number;
  totalReps: number;
  feedback: string[];
  isEstimate: boolean;
}
