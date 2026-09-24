import { ExerciseAnalyzer } from './BaseAnalyzer';
import { PushUpAnalyzer } from './PushUpAnalyzer';
import { SquatAnalyzer } from './SquatAnalyzer';
import { PlankAnalyzer } from './PlankAnalyzer';
import { PullUpAnalyzer } from './PullUpAnalyzer';
import { LungeAnalyzer } from './LungeAnalyzer';
import { PikePushUpAnalyzer } from './PikePushUpAnalyzer';

export function createExerciseAnalyzer(exerciseId: string): ExerciseAnalyzer | null {
  if (exerciseId.includes('push-up') || exerciseId.includes('pushup')) {
    if (exerciseId.includes('pike')) return new PikePushUpAnalyzer(exerciseId);
    return new PushUpAnalyzer(exerciseId);
  }
  if (exerciseId.includes('squat')) return new SquatAnalyzer(exerciseId);
  if (exerciseId.includes('plank')) return new PlankAnalyzer(exerciseId);
  if (exerciseId.includes('chin-up') || exerciseId.includes('pull-up')) return new PullUpAnalyzer(exerciseId);
  if (exerciseId.includes('lunge') || exerciseId.includes('split-squat')) return new LungeAnalyzer(exerciseId);
  return null;
}

export { ExerciseAnalyzer, PushUpAnalyzer, SquatAnalyzer, PlankAnalyzer, PullUpAnalyzer, LungeAnalyzer, PikePushUpAnalyzer };
