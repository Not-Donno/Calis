import { bodyLineAngle, clamp, jointAngle } from '@/ai/pose/geometry';
import { hasVisibleLandmarks } from '@/ai/pose/landmarkMap';
import type { PoseFrame } from '@/ai/pose/types';
import { MovementStateMachine } from './movementStateMachine';
import { ExerciseAnalyzer } from './BaseAnalyzer';

export class LungeAnalyzer extends ExerciseAnalyzer {
  private readonly movement = new MovementStateMachine({ top: 165, bottom: 95, hysteresis: 7 });

  analyze(rawFrame: PoseFrame) {
    const required = ['leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'] as const;
    if (!hasVisibleLandmarks(rawFrame, [...required])) { this.movement.reset(); return this.missing([...required], rawFrame); }
    const frame = this.frame(rawFrame);
    const left = jointAngle(frame, 'leftHip', 'leftKnee', 'leftAnkle');
    const right = jointAngle(frame, 'rightHip', 'rightKnee', 'rightAnkle');
    const knee = left !== null && right !== null ? Math.min(left, right) : left ?? right;
    if (knee === null) { this.movement.reset(); return this.missing(['leftKnee', 'rightKnee'], frame); }
    const state = this.movement.update(knee);
    const torso = bodyLineAngle(frame);
    const feedback: string[] = [];
    let quality = true;
    let score = 86;
    if (knee > 105) { feedback.push('Lower with control; you do not need to go deep.'); quality = false; score -= 10; }
    if (torso !== null && torso > 25) { feedback.push('Keep your torso tall.'); quality = false; score -= 12; }
    if (feedback.length === 0) feedback.push('Good control. Push through the front foot.');
    return this.updateReps(state.phase, state.completed, quality, feedback.slice(0, 2), frame, clamp(score, 0, 100));
  }
}
