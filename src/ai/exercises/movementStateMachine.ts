import type { MovementPhase } from '@/ai/pose/types';

export interface MovementThresholds {
  /** Angle at which the movement is considered bottom. */
  bottom: number;
  /** Angle at which the movement is considered top. */
  top: number;
  /** A small hysteresis band prevents frame noise from changing phase. */
  hysteresis?: number;
  /** Consecutive frames required at each extreme before a rep can complete. */
  minFrames?: number;
}

export class MovementStateMachine {
  private phase: MovementPhase = 'up';
  private bottomFrames = 0;
  private topFrames = 0;
  private reps = 0;
  private reachedBottom = false;

  constructor(private readonly thresholds: MovementThresholds) {}

  update(angle: number | null): { phase: MovementPhase; reps: number; completed: boolean } {
    if (angle === null || !Number.isFinite(angle)) return { phase: this.phase, reps: this.reps, completed: false };
    const hysteresis = this.thresholds.hysteresis ?? 5;
    const minFrames = this.thresholds.minFrames ?? 2;
    const bottom = this.thresholds.bottom;
    const top = this.thresholds.top;
    let completed = false;

    if (angle <= bottom + hysteresis) {
      this.bottomFrames += 1;
      this.topFrames = 0;
      if (this.bottomFrames >= minFrames) {
        this.reachedBottom = true;
        this.phase = 'bottom';
      }
    } else if (angle >= top - hysteresis) {
      this.topFrames += 1;
      this.bottomFrames = 0;
      if (this.topFrames >= minFrames && (this.phase === 'going_up' || this.phase === 'bottom')) {
        this.phase = 'up';
        if (this.reachedBottom) {
          this.reps += 1;
          completed = true;
          this.reachedBottom = false;
        }
      }
    } else if (this.phase === 'up') {
      this.phase = 'going_down';
    } else if (this.phase === 'bottom') {
      this.phase = 'going_up';
    }

    return { phase: this.phase, reps: this.reps, completed };
  }

  get currentReps(): number { return this.reps; }
  get currentPhase(): MovementPhase { return this.phase; }
  reset(): void { this.phase = 'up'; this.bottomFrames = 0; this.topFrames = 0; this.reps = 0; this.reachedBottom = false; }
}
