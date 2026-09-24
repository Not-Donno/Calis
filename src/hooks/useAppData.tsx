import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { calculateNutritionTargets } from '@/services/nutrition';
import { createSession, ensureNutritionTargets, getNutritionTargets, getOrCreateSession, getProfile, getSession, getSettings, saveProfile, saveNutritionTargets, updateSettings } from '@/db/repositories';
import type { AppSettings, NutritionTargets, UserProfile, WorkoutSession } from '@/types';
import { getWorkoutForDate } from '@/data/program';

interface AppDataContextValue {
  ready: boolean;
  loading: boolean;
  error: string | null;
  profile: UserProfile | null;
  settings: AppSettings | null;
  targets: NutritionTargets | null;
  activeSession: WorkoutSession | null;
  refresh: () => Promise<void>;
  saveUserProfile: (input: Parameters<typeof saveProfile>[0]) => Promise<UserProfile>;
  updateAppSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  updateTargets: (targets: NutritionTargets) => Promise<NutritionTargets>;
  startTodayWorkout: () => Promise<WorkoutSession>;
  startWorkout: (date?: Date) => Promise<WorkoutSession>;
  refreshSession: (id: number) => Promise<WorkoutSession>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProfile = await getProfile();
      const nextSettings = await getSettings();
      const nextTargets = nextProfile ? await ensureNutritionTargets(nextProfile) : await getNutritionTargets();
      setProfile(nextProfile);
      setSettings(nextSettings);
      setTargets(nextTargets);
      setReady(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Calis could not open its local database.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const saveUserProfile = useCallback(async (input: Parameters<typeof saveProfile>[0]) => {
    const saved = await saveProfile(input);
    const nextTargets = await ensureNutritionTargets(saved);
    setProfile(saved);
    setTargets(nextTargets);
    setSettings(await getSettings());
    return saved;
  }, []);

  const updateAppSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await updateSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const updateTargets = useCallback(async (next: NutritionTargets) => {
    const saved = await saveNutritionTargets(next);
    setTargets(saved);
    return saved;
  }, []);

  const startTodayWorkout = useCallback(async () => {
    const session = await getOrCreateSession(new Date());
    setActiveSession(session);
    return session;
  }, []);

  const startWorkout = useCallback(async (date = new Date()) => {
    const session = date.toDateString() === new Date().toDateString() ? await getOrCreateSession(date) : await createSession({ day: getWorkoutForDate(date), startedAt: date });
    setActiveSession(session);
    return session;
  }, []);

  const refreshSession = useCallback(async (id: number) => {
    const session = await getSession(id);
    setActiveSession(session);
    return session;
  }, []);

  const value = useMemo<AppDataContextValue>(() => ({
    ready, loading, error, profile, settings, targets, activeSession, refresh, saveUserProfile, updateAppSettings, updateTargets, startTodayWorkout, startWorkout, refreshSession,
  }), [ready, loading, error, profile, settings, targets, activeSession, refresh, saveUserProfile, updateAppSettings, updateTargets, startTodayWorkout, startWorkout, refreshSession]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}

export function useTodayWorkout() {
  return useMemo(() => getWorkoutForDate(new Date()), []);
}

export { calculateNutritionTargets };
