import { FOOD_BY_ID, FOOD_DATABASE } from '@/data/foods';
import { EXERCISE_BY_ID, WORKOUT_DAY_BY_KEY, formatDateKey, getWorkoutForDate } from '@/data/program';
import { calculateNutritionTargets } from '@/services/nutrition';
import type { AppSettings, BackupPayload, BodyMeasurement, Exercise, FoodItem, FoodLog, MacroTotals, MealType, NutritionTargets, PlannedExercise, ProgressionRecord, SessionExercise, SetLog, UserProfile, WorkoutDay, WorkoutSession } from '@/types';
import { getDatabase, resetDatabase, rowToProfile, rowToSettings } from './database';

const now = (): string => new Date().toISOString();

function completedValue(set: { actualReps?: number; durationSec?: number }): number {
  return set.actualReps ?? set.durationSec ?? 0;
}

function bool(value: boolean): number {
  return value ? 1 : 0;
}

function asBool(value: unknown): boolean {
  return Number(value) === 1;
}

export async function getProfile(): Promise<UserProfile | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM profile WHERE id = 1');
  return row ? rowToProfile(row) : null;
}

export interface SaveProfileInput {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: UserProfile['activityLevel'];
  trainingFrequency: number;
  goal: UserProfile['goal'];
  unitSystem: UserProfile['unitSystem'];
}

export async function saveProfile(input: SaveProfileInput): Promise<UserProfile> {
  if (typeof input.name !== 'string' || !Number.isInteger(input.age) || input.age < 13 || input.age > 100 || !isFiniteNumber(input.heightCm) || input.heightCm < 120 || input.heightCm > 230 || !isFiniteNumber(input.weightKg) || input.weightKg < 30 || input.weightKg > 300 || !['sedentary', 'light', 'moderate', 'active'].includes(input.activityLevel) || !Number.isInteger(input.trainingFrequency) || input.trainingFrequency < 0 || input.trainingFrequency > 7 || !['maintain', 'gain', 'lose'].includes(input.goal) || !['metric', 'imperial'].includes(input.unitSystem)) {
    throw new Error('Profile values are outside the supported range.');
  }
  const database = await getDatabase();
  const previous = await getProfile();
  const targetInputsChanged = !previous || previous.age !== input.age || previous.heightCm !== input.heightCm || previous.weightKg !== input.weightKg || previous.activityLevel !== input.activityLevel || previous.trainingFrequency !== input.trainingFrequency || previous.goal !== input.goal;
  const onboardedAt = previous?.onboardedAt ?? now();
  await database.runAsync(
    `INSERT INTO profile (id, name, age, height_cm, weight_kg, activity_level, training_frequency, goal, unit_system, onboarded_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, age = excluded.age, height_cm = excluded.height_cm, weight_kg = excluded.weight_kg,
       activity_level = excluded.activity_level, training_frequency = excluded.training_frequency, goal = excluded.goal, unit_system = excluded.unit_system, onboarded_at = excluded.onboarded_at`,
    input.name.trim() || 'Athlete', input.age, input.heightCm, input.weightKg, input.activityLevel, input.trainingFrequency, input.goal, input.unitSystem, onboardedAt,
  );
  const profile = await getProfile();
  if (!profile) throw new Error('Profile could not be saved.');
  if (targetInputsChanged) await saveNutritionTargets(calculateNutritionTargets(profile));
  await updateSettings({ onboardingComplete: true });
  return profile;
}

export async function getSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1');
  if (!row) throw new Error('Settings are unavailable.');
  return rowToSettings(row);
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const database = await getDatabase();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await database.runAsync(
    `UPDATE settings SET units = ?, camera_preferred_view = ?, haptics_enabled = ?, sound_enabled = ?, notifications_enabled = ?, onboarding_complete = ? WHERE id = 1`,
    next.units, next.cameraPreferredView, bool(next.hapticsEnabled), bool(next.soundEnabled), bool(next.notificationsEnabled), bool(next.onboardingComplete),
  );
  if (patch.units && patch.units !== current.units) {
    await database.runAsync('UPDATE profile SET unit_system = ? WHERE id = 1', patch.units);
  }
  return next;
}

export async function getNutritionTargets(): Promise<NutritionTargets | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM nutrition_targets WHERE id = 1');
  if (!row) return null;
  return {
    calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), fiber: Number(row.fiber), updatedAt: String(row.updated_at),
  };
}

export async function saveNutritionTargets(targets: NutritionTargets): Promise<NutritionTargets> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO nutrition_targets (id, calories, protein, carbs, fat, fiber, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat, fiber = excluded.fiber, updated_at = excluded.updated_at`,
    targets.calories, targets.protein, targets.carbs, targets.fat, targets.fiber, targets.updatedAt,
  );
  return targets;
}

export async function ensureNutritionTargets(profile: UserProfile): Promise<NutritionTargets> {
  const existing = await getNutritionTargets();
  if (existing) return existing;
  return saveNutritionTargets(calculateNutritionTargets(profile));
}

export async function getFoods(search = ''): Promise<FoodItem[]> {
  const database = await getDatabase();
  const query = search.trim();
  const rows = query
    ? await database.getAllAsync<Record<string, unknown>>('SELECT * FROM food_items WHERE name LIKE ? OR local_name LIKE ? OR category LIKE ? ORDER BY name COLLATE NOCASE', `%${query}%`, `%${query}%`, `%${query}%`)
    : await database.getAllAsync<Record<string, unknown>>('SELECT * FROM food_items ORDER BY category, name COLLATE NOCASE');
  return rows.map(rowToFood);
}

export async function addCustomFood(input: Omit<FoodItem, 'id' | 'isCustom'>): Promise<FoodItem> {
  if (!input.name.trim() || !input.category.trim() || !input.servingLabel.trim() || !isFiniteNumber(input.servingGrams) || input.servingGrams < 0 || !isFiniteNumber(input.calories) || input.calories < 0 || !isFiniteNumber(input.protein) || input.protein < 0 || !isFiniteNumber(input.carbs) || input.carbs < 0 || !isFiniteNumber(input.fat) || input.fat < 0 || !isFiniteNumber(input.fiber) || input.fiber < 0) {
    throw new Error('Food values must be non-negative and include a name.');
  }
  const database = await getDatabase();
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO food_items (id, name, local_name, category, serving_label, serving_grams, calories, protein, carbs, fat, fiber, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      id, input.name.trim(), input.localName?.trim() || null, input.category.trim() || 'Custom', input.servingLabel.trim() || '1 serving', input.servingGrams, input.calories, input.protein, input.carbs, input.fat, input.fiber,
    );
    await database.runAsync('INSERT INTO custom_foods (id, created_at) VALUES (?, ?)', id, now());
  });
  return { ...input, id, name: input.name.trim(), category: input.category.trim() || 'Custom', servingLabel: input.servingLabel.trim() || '1 serving', isCustom: true };
}

export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC', date);
  return rows.map(rowToFoodLog);
}

export async function getNutritionHistory(days = 30): Promise<{ date: string; totals: MacroTotals }[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT date, SUM(calories) calories, SUM(protein) protein, SUM(carbs) carbs, SUM(fat) fat, SUM(fiber) fiber FROM food_logs WHERE date >= ? GROUP BY date ORDER BY date DESC', formatDateKey(new Date(Date.now() - days * 86400000)));
  return rows.map((row) => ({ date: String(row.date), totals: { calories: Number(row.calories ?? 0), protein: Number(row.protein ?? 0), carbs: Number(row.carbs ?? 0), fat: Number(row.fat ?? 0), fiber: Number(row.fiber ?? 0) } })).reverse();
}

export async function addFoodLog(input: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog> {
  if (!isValidDateKey(input.date) || !['Breakfast', 'Lunch', 'Dinner', 'Snacks'].includes(input.meal) || !input.foodId || !input.foodName.trim() || !isFiniteNumber(input.servings) || input.servings <= 0 || !isFiniteNumber(input.calories) || input.calories < 0 || !isFiniteNumber(input.protein) || input.protein < 0 || !isFiniteNumber(input.carbs) || input.carbs < 0 || !isFiniteNumber(input.fat) || input.fat < 0 || !isFiniteNumber(input.fiber) || input.fiber < 0) {
    throw new Error('Food log values are outside the supported range.');
  }
  const database = await getDatabase();
  const createdAt = now();
  const result = await database.runAsync(
    `INSERT INTO food_logs (date, meal, food_id, food_name, servings, calories, protein, carbs, fat, fiber, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.date, input.meal, input.foodId, input.foodName, input.servings, input.calories, input.protein, input.carbs, input.fat, input.fiber, createdAt,
  );
  return { ...input, id: Number(result.lastInsertRowId), createdAt };
}

export async function updateFoodLog(log: FoodLog): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE food_logs SET date = ?, meal = ?, food_id = ?, food_name = ?, servings = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ? WHERE id = ?', log.date, log.meal, log.foodId, log.foodName, log.servings, log.calories, log.protein, log.carbs, log.fat, log.fiber, log.id ?? 0);
}

export async function deleteFoodLog(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM food_logs WHERE id = ?', id);
}

export interface CreateSessionOptions {
  day?: WorkoutDay;
  startedAt?: Date;
}

export async function getOrCreateSession(date = new Date()): Promise<WorkoutSession> {
  const database = await getDatabase();
  const day = getWorkoutForDate(date);
  const dayKey = formatDateKey(date);
  const existing = await database.getFirstAsync<{ id: number }>('SELECT id FROM workout_sessions WHERE day_key = ? AND status = ? ORDER BY id DESC LIMIT 1', dayKey, 'in_progress');
  if (existing) return getSession(Number(existing.id));
  return createSession({ day, startedAt: date });
}

export async function createSession(options: CreateSessionOptions = {}): Promise<WorkoutSession> {
  const database = await getDatabase();
  const day = options.day ?? getWorkoutForDate(new Date());
  if (day.isRest) throw new Error('Recovery days do not create a workout session.');
  const startedAt = (options.startedAt ?? new Date()).toISOString();
  let sessionId = 0;
  await database.withTransactionAsync(async () => {
    const result = await database.runAsync('INSERT INTO workout_sessions (day_key, title, started_at, status) VALUES (?, ?, ?, ?)', day.key, day.title, startedAt, 'in_progress');
    sessionId = Number(result.lastInsertRowId);
    for (let order = 0; order < day.exercises.length; order += 1) {
      const item = day.exercises[order];
      if (!item) continue;
      const exerciseResult = await database.runAsync(
        `INSERT INTO session_exercises (session_id, exercise_id, order_index, planned_sets, target_rep_min, target_rep_max, duration_sec, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionId, item.exerciseId, order, item.sets, item.repMin, item.repMax, item.durationSec ?? null, item.restSeconds,
      );
      const sessionExerciseId = Number(exerciseResult.lastInsertRowId);
      for (let setNumber = 1; setNumber <= item.sets; setNumber += 1) {
        await database.runAsync(
          `INSERT INTO exercise_sets (session_exercise_id, exercise_id, set_number, target_rep_min, target_rep_max, duration_sec)
           VALUES (?, ?, ?, ?, ?, ?)`,
          sessionExerciseId, item.exerciseId, setNumber, item.repMin, item.repMax, item.durationSec ?? null,
        );
      }
    }
  });
  return getSession(sessionId);
}

export async function getSession(id: number): Promise<WorkoutSession> {
  const database = await getDatabase();
  const sessionRow = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM workout_sessions WHERE id = ?', id);
  if (!sessionRow) throw new Error('Workout session not found.');
  const exerciseRows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY order_index', id);
  const exercises: SessionExercise[] = [];
  for (const exerciseRow of exerciseRows) {
    const setRows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM exercise_sets WHERE session_exercise_id = ? ORDER BY set_number', Number(exerciseRow.id));
    exercises.push({
      id: Number(exerciseRow.id), sessionId: id, exerciseId: String(exerciseRow.exercise_id), order: Number(exerciseRow.order_index), plannedSets: Number(exerciseRow.planned_sets), targetRepMin: Number(exerciseRow.target_rep_min), targetRepMax: Number(exerciseRow.target_rep_max), durationSec: exerciseRow.duration_sec === null ? undefined : Number(exerciseRow.duration_sec), restSeconds: Number(exerciseRow.rest_seconds), sets: setRows.map(rowToSetLog),
    });
  }
  return {
    id,
    dayKey: String(sessionRow.day_key), title: String(sessionRow.title), startedAt: String(sessionRow.started_at), completedAt: sessionRow.completed_at ? String(sessionRow.completed_at) : undefined, durationSeconds: sessionRow.duration_seconds === null ? undefined : Number(sessionRow.duration_seconds), status: String(sessionRow.status) as WorkoutSession['status'], notes: sessionRow.notes ? String(sessionRow.notes) : undefined, exercises,
  };
}

export async function saveSetLog(input: SetLog & { sessionExerciseId: number }): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE exercise_sets SET actual_reps = ?, duration_sec = ?, completed = ?, quality_reps = ?, form_score = ?, feedback = ?, completed_at = ?
     WHERE session_exercise_id = ? AND set_number = ?`,
    input.actualReps ?? null, input.durationSec ?? null, bool(input.completed), input.qualityReps ?? null, input.formScore ?? null, input.feedback ?? null, input.completedAt ?? (input.completed ? now() : null), input.sessionExerciseId, input.setNumber,
  );
}

export async function completeSession(id: number, notes?: string): Promise<WorkoutSession> {
  const database = await getDatabase();
  const session = await getSession(id);
  if (session.status === 'completed') return session;
  const completedAt = now();
  const duration = Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(session.startedAt)) / 1000));
  await database.withTransactionAsync(async () => {
    await database.runAsync('UPDATE workout_sessions SET status = ?, completed_at = ?, duration_seconds = ?, notes = ? WHERE id = ?', 'completed', completedAt, duration, notes ?? session.notes ?? null, id);
    await recordSessionProgress(database, session);
  });
  return getSession(id);
}

async function recordSessionProgress(database: Awaited<ReturnType<typeof getDatabase>>, session: WorkoutSession): Promise<void> {
  for (const item of session.exercises) {
    const completed = item.sets.filter((set) => set.completed);
    if (completed.length === 0) continue;
    const quality = completed.filter((set) => (set.formScore === undefined || set.formScore >= 70) && completedValue(set) >= (set.targetRepMax || set.targetRepMin)).length;
    const upperRange = completed.filter((set) => completedValue(set) >= (set.targetRepMax || set.targetRepMin)).length >= Math.max(1, item.plannedSets - 1);
    await database.runAsync(
      `INSERT INTO exercise_progress (exercise_id, level, quality_sessions, upper_range_sessions, last_recommended_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(exercise_id) DO UPDATE SET quality_sessions = quality_sessions + excluded.quality_sessions, upper_range_sessions = upper_range_sessions + excluded.upper_range_sessions, last_recommended_at = COALESCE(excluded.last_recommended_at, exercise_progress.last_recommended_at)`,
      item.exerciseId, 0, quality > 0 ? 1 : 0, upperRange ? 1 : 0, quality > 0 ? now() : null,
    );
  }
}

export async function getProgressionRecords(): Promise<ProgressionRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM exercise_progress ORDER BY exercise_id');
  return rows.map((row) => ({ exerciseId: String(row.exercise_id), level: Number(row.level) as ProgressionRecord['level'], qualitySessions: Number(row.quality_sessions), upperRangeSessions: Number(row.upper_range_sessions), lastRecommendedAt: row.last_recommended_at ? String(row.last_recommended_at) : undefined }));
}

export async function abandonSession(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE workout_sessions SET status = ? WHERE id = ?', 'abandoned', id);
}

export async function getRecentSessions(limit = 20): Promise<WorkoutSession[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: number }>('SELECT id FROM workout_sessions WHERE status = ? ORDER BY started_at DESC LIMIT ?', 'completed', limit);
  return Promise.all(rows.map((row) => getSession(Number(row.id))));
}

export async function getAllSessions(limit = 1000): Promise<WorkoutSession[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: number }>('SELECT id FROM workout_sessions ORDER BY started_at DESC LIMIT ?', limit);
  return Promise.all(rows.map((row) => getSession(Number(row.id))));
}

export async function getWorkoutHistory(): Promise<{ date: string; title: string; completedSets: number; totalSets: number; durationSeconds: number }[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT ws.started_at, ws.title, ws.duration_seconds,
      SUM(CASE WHEN es.completed = 1 THEN 1 ELSE 0 END) completed_sets, COUNT(es.id) total_sets
     FROM workout_sessions ws LEFT JOIN session_exercises se ON se.session_id = ws.id LEFT JOIN exercise_sets es ON es.session_exercise_id = se.id
     WHERE ws.status = 'completed' GROUP BY ws.id ORDER BY ws.started_at DESC`,
  );
  return rows.map((row) => ({ date: formatDateKey(new Date(String(row.started_at))), title: String(row.title), completedSets: Number(row.completed_sets ?? 0), totalSets: Number(row.total_sets ?? 0), durationSeconds: Number(row.duration_seconds ?? 0) }));
}

export async function saveMeasurement(input: Omit<BodyMeasurement, 'id'>): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO body_measurements (date, weight_kg, waist_cm, chest_cm, hips_cm, notes) VALUES (?, ?, ?, ?, ?, ?)', input.date, input.weightKg ?? null, input.waistCm ?? null, input.chestCm ?? null, input.hipsCm ?? null, input.notes ?? null);
}

export async function getMeasurements(): Promise<BodyMeasurement[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM body_measurements ORDER BY date DESC');
  return rows.map((row) => ({ id: Number(row.id), date: String(row.date), weightKg: row.weight_kg === null ? undefined : Number(row.weight_kg), waistCm: row.waist_cm === null ? undefined : Number(row.waist_cm), chestCm: row.chest_cm === null ? undefined : Number(row.chest_cm), hipsCm: row.hips_cm === null ? undefined : Number(row.hips_cm), notes: row.notes ? String(row.notes) : undefined }));
}

export async function exportBackup(): Promise<BackupPayload> {
  const [profile, settings, nutritionTargets, nutritionLogs, customFoods, workouts, measurements, progress] = await Promise.all([
    getProfile(), getSettings(), getNutritionTargets(), getAllFoodLogs(), getCustomFoods(), getAllSessions(1000), getMeasurements(), getProgressionRecords(),
  ]);
  return {
    format: 'calis-backup', version: 1, exportedAt: now(), profile, settings, nutritionTargets, nutritionLogs, customFoods, workouts, measurements, progress: Object.fromEntries(progress.map((record) => [record.exerciseId, record])),
  };
}

async function getCustomFoods(): Promise<FoodItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT food_items.* FROM food_items INNER JOIN custom_foods ON custom_foods.id = food_items.id ORDER BY food_items.name');
  return rows.map(rowToFood);
}

async function getAllFoodLogs(): Promise<FoodLog[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM food_logs ORDER BY created_at ASC');
  return rows.map(rowToFoodLog);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isOptionalNonNegativeNumber(value: unknown, integer = false): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0 && (!integer || Number.isInteger(value)));
}

function isOptionalPositiveInteger(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && Number.isInteger(value) && value > 0);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isKnownExerciseId(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXERCISE_BY_ID, value);
}

function isValidProfile(value: unknown): value is UserProfile | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const activityLevels = ['sedentary', 'light', 'moderate', 'active'];
  const goals = ['maintain', 'gain', 'lose'];
  const units = ['metric', 'imperial'];
  return value.id === 1 && typeof value.name === 'string' && value.name.trim().length > 0 && isFiniteNumber(value.age) && Number.isInteger(value.age) && value.age >= 13 && value.age <= 100 && isFiniteNumber(value.heightCm) && value.heightCm >= 120 && value.heightCm <= 230 && isFiniteNumber(value.weightKg) && value.weightKg >= 30 && value.weightKg <= 300 && typeof value.activityLevel === 'string' && activityLevels.includes(value.activityLevel) && isFiniteNumber(value.trainingFrequency) && Number.isInteger(value.trainingFrequency) && value.trainingFrequency >= 0 && value.trainingFrequency <= 7 && typeof value.goal === 'string' && goals.includes(value.goal) && typeof value.unitSystem === 'string' && units.includes(value.unitSystem) && isValidTimestamp(value.onboardedAt);
}

function isValidSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false;
  const units = ['metric', 'imperial'];
  const views = ['side', 'front', 'three-quarter'];
  return typeof value.units === 'string' && units.includes(value.units) && typeof value.cameraPreferredView === 'string' && views.includes(value.cameraPreferredView) && typeof value.hapticsEnabled === 'boolean' && typeof value.soundEnabled === 'boolean' && typeof value.notificationsEnabled === 'boolean' && typeof value.onboardingComplete === 'boolean';
}

function isValidFood(value: unknown): value is FoodItem {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0 && typeof value.name === 'string' && value.name.trim().length > 0 && isOptionalString(value.localName) && typeof value.category === 'string' && value.category.trim().length > 0 && typeof value.servingLabel === 'string' && value.servingLabel.trim().length > 0 && isFiniteNumber(value.servingGrams) && value.servingGrams >= 0 && isFiniteNumber(value.calories) && value.calories >= 0 && isFiniteNumber(value.protein) && value.protein >= 0 && isFiniteNumber(value.carbs) && value.carbs >= 0 && isFiniteNumber(value.fat) && value.fat >= 0 && isFiniteNumber(value.fiber) && value.fiber >= 0 && (value.isCustom === undefined || value.isCustom === true);
}

function isValidLog(value: unknown): value is FoodLog {
  if (!isRecord(value)) return false;
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  return isOptionalPositiveInteger(value.id) && isValidDateKey(value.date) && typeof value.meal === 'string' && meals.includes(value.meal) && typeof value.foodId === 'string' && value.foodId.length > 0 && typeof value.foodName === 'string' && value.foodName.trim().length > 0 && isFiniteNumber(value.servings) && value.servings > 0 && isFiniteNumber(value.calories) && value.calories >= 0 && isFiniteNumber(value.protein) && value.protein >= 0 && isFiniteNumber(value.carbs) && value.carbs >= 0 && isFiniteNumber(value.fat) && value.fat >= 0 && isFiniteNumber(value.fiber) && value.fiber >= 0 && isValidTimestamp(value.createdAt);
}

function isValidMeasurement(value: unknown): value is BodyMeasurement {
  if (!isRecord(value) || !isValidDateKey(value.date) || !isOptionalPositiveInteger(value.id) || !isOptionalString(value.notes)) return false;
  return [value.weightKg, value.waistCm, value.chestCm, value.hipsCm].every((item) => item === undefined || (isFiniteNumber(item) && item >= 0));
}

function isValidWorkout(value: unknown): value is WorkoutSession {
  if (!isRecord(value) || !isValidDateKey(value.dayKey) || typeof value.title !== 'string' || value.title.trim().length === 0 || !isValidTimestamp(value.startedAt) || !isOptionalString(value.completedAt) || (value.completedAt !== undefined && !isValidTimestamp(value.completedAt)) || !isOptionalPositiveInteger(value.id) || !isOptionalNonNegativeNumber(value.durationSeconds) || !isOptionalString(value.notes) || typeof value.status !== 'string' || !['in_progress', 'completed', 'abandoned'].includes(value.status) || !Array.isArray(value.exercises)) return false;
  return value.exercises.every((item) => {
    if (!isRecord(item) || typeof item.exerciseId !== 'string' || !isKnownExerciseId(item.exerciseId) || !isOptionalPositiveInteger(item.id) || !isOptionalPositiveInteger(item.sessionId) || !isFiniteNumber(item.order) || !Number.isInteger(item.order) || item.order < 0 || !isFiniteNumber(item.plannedSets) || !Number.isInteger(item.plannedSets) || item.plannedSets < 0 || !isFiniteNumber(item.targetRepMin) || item.targetRepMin < 0 || !isFiniteNumber(item.targetRepMax) || item.targetRepMax < 0 || !isOptionalNonNegativeNumber(item.durationSec) || item.durationSec === 0 || !isFiniteNumber(item.restSeconds) || item.restSeconds < 0 || !Array.isArray(item.sets)) return false;
    return item.sets.every((set) => isRecord(set) && set.exerciseId === item.exerciseId && isOptionalPositiveInteger(set.id) && isOptionalPositiveInteger(set.sessionExerciseId) && isFiniteNumber(set.setNumber) && Number.isInteger(set.setNumber) && set.setNumber > 0 && isFiniteNumber(set.targetRepMin) && set.targetRepMin >= 0 && isFiniteNumber(set.targetRepMax) && set.targetRepMax >= 0 && isOptionalNonNegativeNumber(set.actualReps) && isOptionalNonNegativeNumber(set.durationSec) && isOptionalNonNegativeNumber(set.qualityReps) && isOptionalNonNegativeNumber(set.formScore) && (set.formScore === undefined || set.formScore <= 100) && typeof set.completed === 'boolean' && isOptionalString(set.feedback) && isOptionalString(set.completedAt) && (set.completedAt === undefined || isValidTimestamp(set.completedAt)));
  });
}

function isValidProgressRecord(value: unknown): value is ProgressionRecord {
  return isRecord(value) && typeof value.exerciseId === 'string' && isKnownExerciseId(value.exerciseId) && isFiniteNumber(value.level) && Number.isInteger(value.level) && value.level >= 0 && value.level <= 5 && isFiniteNumber(value.qualitySessions) && Number.isInteger(value.qualitySessions) && value.qualitySessions >= 0 && isFiniteNumber(value.upperRangeSessions) && Number.isInteger(value.upperRangeSessions) && value.upperRangeSessions >= 0 && isOptionalString(value.lastRecommendedAt) && (value.lastRecommendedAt === undefined || isValidTimestamp(value.lastRecommendedAt));
}

export function validateBackup(value: unknown): value is BackupPayload {
  if (!isRecord(value) || value.format !== 'calis-backup' || value.version !== 1 || !isValidTimestamp(value.exportedAt) || !isValidSettings(value.settings) || !isValidProfile(value.profile)) return false;
  if (value.settings.onboardingComplete && value.profile === null) return false;
  if (!Array.isArray(value.nutritionLogs) || !value.nutritionLogs.every(isValidLog)) return false;
  if (!Array.isArray(value.customFoods) || !value.customFoods.every(isValidFood)) return false;
  const customFoodIds = new Set<string>();
  for (const food of value.customFoods) {
    if (customFoodIds.has(food.id) || FOOD_BY_ID[food.id]) return false;
    customFoodIds.add(food.id);
  }
  const validFoodIds = new Set([...Object.keys(FOOD_BY_ID), ...customFoodIds]);
  if (value.nutritionLogs.some((log) => !validFoodIds.has(log.foodId))) return false;
  if (!Array.isArray(value.workouts) || !value.workouts.every(isValidWorkout)) return false;
  const sessionIds = new Set<number>();
  for (const session of value.workouts) {
    if (session.id !== undefined) {
      if (sessionIds.has(session.id)) return false;
      sessionIds.add(session.id);
    }
  }
  if (!Array.isArray(value.measurements) || !value.measurements.every(isValidMeasurement)) return false;
  if (!isRecord(value.progress) || !Object.entries(value.progress).every(([key, record]) => isValidProgressRecord(record) && record.exerciseId === key)) return false;
  if (value.nutritionTargets !== null) {
    if (!isRecord(value.nutritionTargets) || !isFiniteNumber(value.nutritionTargets.calories) || value.nutritionTargets.calories < 0 || !isFiniteNumber(value.nutritionTargets.protein) || value.nutritionTargets.protein < 0 || !isFiniteNumber(value.nutritionTargets.carbs) || value.nutritionTargets.carbs < 0 || !isFiniteNumber(value.nutritionTargets.fat) || value.nutritionTargets.fat < 0 || !isFiniteNumber(value.nutritionTargets.fiber) || value.nutritionTargets.fiber < 0 || !isValidTimestamp(value.nutritionTargets.updatedAt)) return false;
  }
  return true;
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  if (!validateBackup(payload)) throw new Error('This file is not a valid Calis backup.');
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await database.execAsync('DELETE FROM exercise_sets; DELETE FROM session_exercises; DELETE FROM workout_sessions; DELETE FROM food_logs; DELETE FROM custom_foods; DELETE FROM food_items WHERE is_custom = 1; DELETE FROM exercise_progress; DELETE FROM body_measurements; DELETE FROM profile; DELETE FROM nutrition_targets; DELETE FROM settings;');
    if (payload.profile) {
      const p = payload.profile;
      await database.runAsync('INSERT INTO profile (id, name, age, height_cm, weight_kg, activity_level, training_frequency, goal, unit_system, onboarded_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)', p.name, p.age, p.heightCm, p.weightKg, p.activityLevel, p.trainingFrequency, p.goal, p.unitSystem, p.onboardedAt);
    }
    const s = payload.settings;
    await database.runAsync('INSERT INTO settings (id, units, camera_preferred_view, haptics_enabled, sound_enabled, notifications_enabled, onboarding_complete) VALUES (1, ?, ?, ?, ?, ?, ?)', s.units, s.cameraPreferredView, bool(s.hapticsEnabled), bool(s.soundEnabled), bool(s.notificationsEnabled), bool(s.onboardingComplete));
    if (payload.nutritionTargets) {
      const t = payload.nutritionTargets;
      await database.runAsync('INSERT INTO nutrition_targets (id, calories, protein, carbs, fat, fiber, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?)', t.calories, t.protein, t.carbs, t.fat, t.fiber, t.updatedAt);
    }
    for (const food of payload.customFoods) {
      await database.runAsync('INSERT OR REPLACE INTO food_items (id, name, local_name, category, serving_label, serving_grams, calories, protein, carbs, fat, fiber, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', food.id, food.name, food.localName ?? null, food.category, food.servingLabel, food.servingGrams, food.calories, food.protein, food.carbs, food.fat, food.fiber);
      await database.runAsync('INSERT OR REPLACE INTO custom_foods (id, created_at) VALUES (?, ?)', food.id, now());
    }
    for (const log of payload.nutritionLogs) {
      if (!log.foodId || !log.foodName) continue;
      await database.runAsync('INSERT INTO food_logs (date, meal, food_id, food_name, servings, calories, protein, carbs, fat, fiber, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', log.date, log.meal, log.foodId, log.foodName, log.servings, log.calories, log.protein, log.carbs, log.fat, log.fiber, log.createdAt);
    }
    for (const measurement of payload.measurements) {
      await database.runAsync('INSERT INTO body_measurements (date, weight_kg, waist_cm, chest_cm, hips_cm, notes) VALUES (?, ?, ?, ?, ?, ?)', measurement.date, measurement.weightKg ?? null, measurement.waistCm ?? null, measurement.chestCm ?? null, measurement.hipsCm ?? null, measurement.notes ?? null);
    }
    for (const record of Object.values(payload.progress ?? {})) {
      if (!isRecord(record) || typeof record.exerciseId !== 'string' || !isFiniteNumber(record.level) || !isFiniteNumber(record.qualitySessions) || !isFiniteNumber(record.upperRangeSessions)) continue;
      await database.runAsync('INSERT OR REPLACE INTO exercise_progress (exercise_id, level, quality_sessions, upper_range_sessions, last_recommended_at) VALUES (?, ?, ?, ?, ?)', record.exerciseId, record.level, record.qualitySessions, record.upperRangeSessions, typeof record.lastRecommendedAt === 'string' ? record.lastRecommendedAt : null);
    }
    for (const session of payload.workouts) {
      const result = await database.runAsync('INSERT INTO workout_sessions (id, day_key, title, started_at, completed_at, duration_seconds, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', session.id ?? null, session.dayKey, session.title, session.startedAt, session.completedAt ?? null, session.durationSeconds ?? null, session.status, session.notes ?? null);
      const sessionId = Number(result.lastInsertRowId);
      for (const item of session.exercises) {
        const exerciseResult = await database.runAsync('INSERT INTO session_exercises (session_id, exercise_id, order_index, planned_sets, target_rep_min, target_rep_max, duration_sec, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', sessionId, item.exerciseId, item.order, item.plannedSets, item.targetRepMin, item.targetRepMax, item.durationSec ?? null, item.restSeconds);
        const sessionExerciseId = Number(exerciseResult.lastInsertRowId);
        for (const set of item.sets) {
          await database.runAsync('INSERT INTO exercise_sets (session_exercise_id, exercise_id, set_number, target_rep_min, target_rep_max, actual_reps, duration_sec, completed, quality_reps, form_score, feedback, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', sessionExerciseId, set.exerciseId, set.setNumber, set.targetRepMin, set.targetRepMax, set.actualReps ?? null, set.durationSec ?? null, bool(set.completed), set.qualityReps ?? null, set.formScore ?? null, set.feedback ?? null, set.completedAt ?? null);
        }
      }
    }
  });
}

export async function resetAllData(): Promise<void> {
  await resetDatabase();
}

function rowToFood(row: Record<string, unknown>): FoodItem {
  return { id: String(row.id), name: String(row.name), localName: row.local_name ? String(row.local_name) : undefined, category: String(row.category), servingLabel: String(row.serving_label), servingGrams: Number(row.serving_grams), calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), fiber: Number(row.fiber), isCustom: asBool(row.is_custom) };
}

function rowToFoodLog(row: Record<string, unknown>): FoodLog {
  return { id: Number(row.id), date: String(row.date), meal: String(row.meal) as MealType, foodId: String(row.food_id), foodName: String(row.food_name), servings: Number(row.servings), calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), fiber: Number(row.fiber), createdAt: String(row.created_at) };
}

function rowToSetLog(row: Record<string, unknown>): SetLog {
  return { id: Number(row.id), sessionExerciseId: Number(row.session_exercise_id), exerciseId: String(row.exercise_id), setNumber: Number(row.set_number), targetRepMin: Number(row.target_rep_min), targetRepMax: Number(row.target_rep_max), actualReps: row.actual_reps === null ? undefined : Number(row.actual_reps), durationSec: row.duration_sec === null ? undefined : Number(row.duration_sec), completed: asBool(row.completed), qualityReps: row.quality_reps === null ? undefined : Number(row.quality_reps), formScore: row.form_score === null ? undefined : Number(row.form_score), feedback: row.feedback ? String(row.feedback) : undefined, completedAt: row.completed_at ? String(row.completed_at) : undefined };
}

export { FOOD_BY_ID, FOOD_DATABASE, EXERCISE_BY_ID, WORKOUT_DAY_BY_KEY };
export type { Exercise, PlannedExercise };
