import { bodyLineAngle, clamp, jointAngle } from '@/ai/pose/geometry';
import { hasVisibleLandmarks } from '@/ai/pose/landmarkMap';
import type { PoseFrame } from '@/ai/pose/types';
import { MovementStateMachine } from './movementStateMachine';
import { ExerciseAnalyzer } from './BaseAnalyzer';

export class SquatAnalyzer extends ExerciseAnalyzer {
  private readonly movement = new MovementStateMachine({ top: 165, bottom: 100, hysteresis: 7 });

  analyze(rawFrame: PoseFrame) {
    const required = ['leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'] as const;
    if (!hasVisibleLandmarks(rawFrame, [...required])) { this.movement.reset(); return this.missing([...required], rawFrame); }
    const frame = this.frame(rawFrame);
    const leftKnee = jointAngle(frame, 'leftHip', 'leftKnee', 'leftAnkle');
    const rightKnee = jointAngle(frame, 'rightHip', 'rightKnee', 'rightAnkle');
    const knee = leftKnee !== null && rightKnee !== null ? (leftKnee + rightKnee) / 2 : leftKnee ?? rightKnee;
    if (knee === null) { this.movement.reset(); return this.missing(['leftKnee', 'rightKnee'], frame); }
    const state = this.movement.update(knee);
    const torso = bodyLineAngle(frame);
    const feedback: string[] = [];
    let quality = true;
    let score = 88;
    if (knee > 108) { feedback.push('Try to sit a little farther back and down.'); quality = false; score -= 14; }
    if (torso !== null && torso > 28) { feedback.push('Keep your chest and hips controlled.'); quality = false; score -= 12; }
    if (feedback.length === 0) feedback.push('Good depth. Drive through your whole foot.');
    return this.updateReps(state.phase, state.completed, quality, feedback.slice(0, 2), frame, clamp(score, 0, 100));
  }
}
