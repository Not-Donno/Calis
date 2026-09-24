import type { AnalyzerUpdate, MovementPhase, PoseFrame } from '@/ai/pose/types';
import { LandmarkSmoother } from '@/ai/pose/landmarkMap';

export abstract class ExerciseAnalyzer {
  protected readonly smoother = new LandmarkSmoother();
  protected reps = 0;
  protected goodReps = 0;
  protected phase: MovementPhase = 'up';

  constructor(public readonly exerciseId: string) {}

  abstract analyze(rawFrame: PoseFrame): AnalyzerUpdate;

  protected frame(rawFrame: PoseFrame): PoseFrame { return this.smoother.update(rawFrame); }

  protected missing(landmarks: (keyof PoseFrame['landmarks'])[], rawFrame: PoseFrame): AnalyzerUpdate {
    this.smoother.reset();
    return { exerciseId: this.exerciseId, phase: this.phase, reps: this.reps, goodReps: this.goodReps, feedback: ['Keep your full body in view.', 'Step back until your landmarks are visible.'], landmarks: rawFrame, isEstimate: true };
  }

  protected updateReps(phase: MovementPhase, completed: boolean, quality: boolean, feedback: string[], rawFrame: PoseFrame, formScore?: number): AnalyzerUpdate {
    this.phase = phase;
    if (completed) {
      this.reps += 1;
      if (quality) this.goodReps += 1;
    }
    return { exerciseId: this.exerciseId, phase, reps: this.reps, goodReps: this.goodReps, formScore, feedback, landmarks: rawFrame, isEstimate: true };
  }

  reset(): void { this.smoother.reset(); this.reps = 0; this.goodReps = 0; this.phase = 'up'; }
}
