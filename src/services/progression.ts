import type { Exercise, ProgressionRecord, SessionExercise } from '@/types';

export interface ProgressionRecommendation {
  exerciseId: string;
  currentLevel: number;
  ready: boolean;
  message: string;
  nextExerciseId?: string;
}

function completedValue(set: { actualReps?: number; durationSec?: number }): number {
  return set.actualReps ?? set.durationSec ?? 0;
}

export function evaluateProgression(
  exercise: Exercise,
  recentSessions: SessionExercise[][],
  record?: ProgressionRecord,
): ProgressionRecommendation {
  const relevant = recentSessions.filter((session) => session.some((item) => item.exerciseId === exercise.id));
  const completedSets = relevant.flatMap((session) => session.filter((item) => item.exerciseId === exercise.id).flatMap((item) => item.sets));
  const qualitySets = completedSets.filter((set) => set.completed && (set.qualityReps ?? completedValue(set)) >= (set.targetRepMax || set.targetRepMin));
  const goodForm = completedSets.filter((set) => set.completed && (set.formScore === undefined || set.formScore >= 70));
  const upperRangeSessions = relevant.filter((session) => {
    const item = session.find((candidate) => candidate.exerciseId === exercise.id);
    return item ? item.sets.filter((set) => set.completed && completedValue(set) >= (set.targetRepMax || set.targetRepMin)).length >= Math.max(1, item.plannedSets - 1) : false;
  }).length;
  const enoughHistory = relevant.length >= 3;
  const enoughQuality = qualitySets.length >= 6 && goodForm.length >= 4;
  const ready = Boolean(exercise.nextLevelId && enoughHistory && enoughQuality && upperRangeSessions >= 2);

  if (ready && exercise.nextLevelId) {
    return {
      exerciseId: exercise.id,
      currentLevel: exercise.level,
      ready: true,
      nextExerciseId: exercise.nextLevelId,
      message: `You are building a reliable base. Consider trying the next variation when you feel ready.`,
    };
  }

  const remaining = Math.max(0, 3 - relevant.length);
  return {
    exerciseId: exercise.id,
    currentLevel: exercise.level,
    ready: false,
    message: remaining > 0
      ? `Complete ${remaining} more quality session${remaining === 1 ? '' : 's'} before considering a harder variation.`
      : 'Keep the range comfortable and prioritize controlled reps.',
  };
}

export function progressionLabel(record?: ProgressionRecord): string {
  if (!record) return 'Building your base';
  if (record.qualitySessions >= 3) return 'Ready to progress';
  return `${record.qualitySessions} quality session${record.qualitySessions === 1 ? '' : 's'}`;
}
