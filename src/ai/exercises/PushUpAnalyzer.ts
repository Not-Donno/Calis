import { bodyLineAngle, clamp, jointAngle } from '@/ai/pose/geometry';
import { hasVisibleLandmarks } from '@/ai/pose/landmarkMap';
import type { PoseFrame } from '@/ai/pose/types';
import { MovementStateMachine } from './movementStateMachine';
import { ExerciseAnalyzer } from './BaseAnalyzer';

export class PushUpAnalyzer extends ExerciseAnalyzer {
  private readonly movement = new MovementStateMachine({ top: 160, bottom: 88, hysteresis: 7 });

  analyze(rawFrame: PoseFrame) {
    if (!hasVisibleLandmarks(rawFrame, ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftHip', 'rightHip'])) { this.movement.reset(); return this.missing(['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftHip', 'rightHip'], rawFrame); }
    const frame = this.frame(rawFrame);
    const leftElbow = jointAngle(frame, 'leftShoulder', 'leftElbow', 'leftWrist');
    const rightElbow = jointAngle(frame, 'rightShoulder', 'rightElbow', 'rightWrist');
    const elbow = leftElbow !== null && rightElbow !== null ? (leftElbow + rightElbow) / 2 : leftElbow ?? rightElbow;
    if (elbow === null) { this.movement.reset(); return this.missing(['leftElbow', 'rightElbow'], frame); }
    const state = this.movement.update(elbow);
    const alignment = bodyLineAngle(frame);
    const feedback: string[] = [];
    let quality = true;
    let score = 86;
    if (elbow < 78) { feedback.push('Try to control the depth.'); quality = false; score -= 12; }
    if (alignment !== null && alignment > 18) { feedback.push('Keep your hips aligned with your shoulders.'); quality = false; score -= 18; }
    if (alignment !== null && alignment < 5) feedback.push('Nice body line. Keep the movement controlled.');
    if (feedback.length === 0) feedback.push('Good rep. Keep the tempo steady.');
    return this.updateReps(state.phase, state.completed, quality, feedback.slice(0, 2), frame, clamp(score, 0, 100));
  }
}
