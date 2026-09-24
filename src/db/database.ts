import * as SQLite from 'expo-sqlite';

import { EXERCISES, WORKOUT_DAYS } from '@/data/program';
import { FOOD_DATABASE } from '@/data/foods';
import type { AppSettings, UserProfile } from '@/types';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DEFAULT_SETTINGS: AppSettings = {
  units: 'metric',
  cameraPreferredView: 'side',
  hapticsEnabled: true,
  soundEnabled: true,
  notificationsEnabled: false,
  onboardingComplete: false,
};

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Athlete',
        age INTEGER NOT NULL,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        activity_level TEXT NOT NULL,
        training_frequency INTEGER NOT NULL,
        goal TEXT NOT NULL,
        unit_system TEXT NOT NULL DEFAULT 'metric',
        onboarded_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        units TEXT NOT NULL DEFAULT 'metric',
        camera_preferred_view TEXT NOT NULL DEFAULT 'side',
        haptics_enabled INTEGER NOT NULL DEFAULT 1,
        sound_enabled INTEGER NOT NULL DEFAULT 1,
        notifications_enabled INTEGER NOT NULL DEFAULT 0,
        onboarding_complete INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS nutrition_targets (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        fat INTEGER NOT NULL,
        fiber INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        category TEXT NOT NULL,
        muscles_json TEXT NOT NULL,
        equipment TEXT NOT NULL,
        instructions_json TEXT NOT NULL,
        cues_json TEXT NOT NULL,
        camera_view TEXT NOT NULL,
        rep_min INTEGER,
        rep_max INTEGER,
        duration_sec INTEGER,
        default_sets INTEGER NOT NULL,
        rest_seconds INTEGER NOT NULL,
        level INTEGER NOT NULL,
        next_level_id TEXT,
        camera_supported INTEGER NOT NULL DEFAULT 0,
        beginner_friendly INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS workout_plans (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'bundled'
      );
      CREATE TABLE IF NOT EXISTS workout_plan_days (
        plan_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        day_key TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        focus TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        is_rest INTEGER NOT NULL DEFAULT 0,
        warmup_json TEXT NOT NULL DEFAULT '[]',
        conditioning_json TEXT NOT NULL DEFAULT '[]',
        PRIMARY KEY (plan_id, day_of_week),
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS workout_plan_exercises (
        plan_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        sets INTEGER NOT NULL,
        rep_min INTEGER NOT NULL,
        rep_max INTEGER NOT NULL,
        duration_sec INTEGER,
        rest_seconds INTEGER NOT NULL,
        PRIMARY KEY (plan_id, day_of_week, order_index),
        FOREIGN KEY (plan_id, day_of_week) REFERENCES workout_plan_days(plan_id, day_of_week) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_key TEXT NOT NULL,
        title TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_seconds INTEGER,
        status TEXT NOT NULL DEFAULT 'in_progress',
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS session_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        planned_sets INTEGER NOT NULL,
        target_rep_min INTEGER NOT NULL,
        target_rep_max INTEGER NOT NULL,
        duration_sec INTEGER,
        rest_seconds INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );
      CREATE TABLE IF NOT EXISTS exercise_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_exercise_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        target_rep_min INTEGER NOT NULL,
        target_rep_max INTEGER NOT NULL,
        actual_reps INTEGER,
        duration_sec INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        quality_reps INTEGER,
        form_score REAL,
        feedback TEXT,
        completed_at TEXT,
        FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );
      CREATE TABLE IF NOT EXISTS exercise_progress (
        exercise_id TEXT PRIMARY KEY NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        quality_sessions INTEGER NOT NULL DEFAULT 0,
        upper_range_sessions INTEGER NOT NULL DEFAULT 0,
        last_recommended_at TEXT,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS food_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        local_name TEXT,
        category TEXT NOT NULL,
        serving_label TEXT NOT NULL,
        serving_grams REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        fiber REAL NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS custom_foods (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (id) REFERENCES food_items(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS food_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal TEXT NOT NULL,
        food_id TEXT NOT NULL,
        food_name TEXT NOT NULL,
        servings REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        fiber REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (food_id) REFERENCES food_items(id)
      );
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        weight_kg REAL,
        waist_cm REAL,
        chest_cm REAL,
        hips_cm REAL,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      );
    `,
  },
];

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

function intToBool(value: unknown): boolean {
  return Number(value) === 1;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('calis.db')
      .then(async (database) => {
        await runMigrations(database);
        await seedBundledData(database);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await database.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // The web SQLite adapter may not expose file-backed WAL; foreign keys still work.
  }
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);');
  const appliedRows = await database.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => Number(row.version)));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', migration.version, new Date().toISOString());
    });
  }
}

async function seedExercises(database: SQLite.SQLiteDatabase): Promise<void> {
  for (const exercise of EXERCISES) {
    await database.runAsync(
      `INSERT OR IGNORE INTO exercises (id, name, short_name, category, muscles_json, equipment, instructions_json, cues_json, camera_view, rep_min, rep_max, duration_sec, default_sets, rest_seconds, level, next_level_id, camera_supported, beginner_friendly)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      exercise.id, exercise.name, exercise.shortName, exercise.category, JSON.stringify(exercise.muscles), exercise.equipment, JSON.stringify(exercise.instructions), JSON.stringify(exercise.cues), exercise.cameraView, exercise.repMin ?? null, exercise.repMax ?? null, exercise.durationSec ?? null, exercise.defaultSets, exercise.restSeconds, exercise.level, exercise.nextLevelId ?? null, boolToInt(exercise.cameraSupported), boolToInt(exercise.beginnerFriendly),
    );
  }
}

async function seedBundledData(database: SQLite.SQLiteDatabase): Promise<void> {
  // Plan rows reference exercises, so seed the reference catalog first.
  await seedExercises(database);
  await database.runAsync('INSERT OR IGNORE INTO workout_plans (id, name, description) VALUES (?, ?, ?)', 'beginner-foundations', 'Beginner Foundations', 'Evidence-informed beginner structure emphasizing technique, progression, and recovery.');

  for (const day of WORKOUT_DAYS) {
    await database.runAsync('DELETE FROM workout_plan_exercises WHERE plan_id = ? AND day_of_week = ?', 'beginner-foundations', day.dayOfWeek);
    await database.runAsync(
      `INSERT OR IGNORE INTO workout_plan_days (plan_id, day_of_week, day_key, title, subtitle, focus, duration_minutes, is_rest, warmup_json, conditioning_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'beginner-foundations', day.dayOfWeek, day.key, day.title, day.subtitle, day.focus, day.durationMinutes, boolToInt(day.isRest), JSON.stringify(day.warmup), JSON.stringify(day.conditioning ?? []),
    );
    for (let index = 0; index < day.exercises.length; index += 1) {
      const item = day.exercises[index];
      if (!item) continue;
      await database.runAsync(
        `INSERT OR IGNORE INTO workout_plan_exercises (plan_id, day_of_week, order_index, exercise_id, sets, rep_min, rep_max, duration_sec, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'beginner-foundations', day.dayOfWeek, index, item.exerciseId, item.sets, item.repMin, item.repMax, item.durationSec ?? null, item.restSeconds,
      );
    }
  }

  // Reference exercises were seeded before plan rows above.
  for (const food of FOOD_DATABASE) {
    await database.runAsync(
      `INSERT OR IGNORE INTO food_items (id, name, local_name, category, serving_label, serving_grams, calories, protein, carbs, fat, fiber, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      food.id, food.name, food.localName ?? null, food.category, food.servingLabel, food.servingGrams, food.calories, food.protein, food.carbs, food.fat, food.fiber,
    );
  }

  const settings = await database.getFirstAsync<{ id: number }>('SELECT id FROM settings WHERE id = 1');
  if (!settings) {
    await database.runAsync('INSERT INTO settings (id, units, camera_preferred_view, haptics_enabled, sound_enabled, notifications_enabled, onboarding_complete) VALUES (1, ?, ?, ?, ?, ?, ?)', DEFAULT_SETTINGS.units, DEFAULT_SETTINGS.cameraPreferredView, boolToInt(DEFAULT_SETTINGS.hapticsEnabled), boolToInt(DEFAULT_SETTINGS.soundEnabled), boolToInt(DEFAULT_SETTINGS.notificationsEnabled), boolToInt(DEFAULT_SETTINGS.onboardingComplete));
  }
}

export function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: Number(row.id),
    name: String(row.name),
    age: Number(row.age),
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activityLevel: String(row.activity_level) as UserProfile['activityLevel'],
    trainingFrequency: Number(row.training_frequency),
    goal: String(row.goal) as UserProfile['goal'],
    unitSystem: String(row.unit_system) as UserProfile['unitSystem'],
    onboardedAt: String(row.onboarded_at),
  };
}

export function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    units: String(row.units) as AppSettings['units'],
    cameraPreferredView: String(row.camera_preferred_view) as AppSettings['cameraPreferredView'],
    hapticsEnabled: intToBool(row.haptics_enabled),
    soundEnabled: intToBool(row.sound_enabled),
    notificationsEnabled: intToBool(row.notifications_enabled),
    onboardingComplete: intToBool(row.onboarding_complete),
  };
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await database.execAsync('DELETE FROM exercise_sets; DELETE FROM session_exercises; DELETE FROM workout_sessions; DELETE FROM food_logs; DELETE FROM custom_foods; DELETE FROM food_items WHERE is_custom = 1; DELETE FROM exercise_progress; DELETE FROM body_measurements; DELETE FROM profile; DELETE FROM nutrition_targets; DELETE FROM settings;');
  });
  await seedBundledData(database);
}
