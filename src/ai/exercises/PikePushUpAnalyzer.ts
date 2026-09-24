import { clamp, jointAngle } from '@/ai/pose/geometry';
import { hasVisibleLandmarks } from '@/ai/pose/landmarkMap';
import type { PoseFrame } from '@/ai/pose/types';
import { MovementStateMachine } from './movementStateMachine';
import { ExerciseAnalyzer } from './BaseAnalyzer';

export class PikePushUpAnalyzer extends ExerciseAnalyzer {
  private readonly movement = new MovementStateMachine({ top: 160, bottom: 85, hysteresis: 7 });

  analyze(rawFrame: PoseFrame) {
    const required = ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist', 'leftHip', 'rightHip'] as const;
    if (!hasVisibleLandmarks(rawFrame, [...required])) { this.movement.reset(); return this.missing([...required], rawFrame); }
    const frame = this.frame(rawFrame);
    const left = jointAngle(frame, 'leftShoulder', 'leftElbow', 'leftWrist');
    const right = jointAngle(frame, 'rightShoulder', 'rightElbow', 'rightWrist');
    const elbow = left !== null && right !== null ? (left + right) / 2 : left ?? right;
    if (elbow === null) { this.movement.reset(); return this.missing(['leftElbow', 'rightElbow'], frame); }
    const state = this.movement.update(elbow);
    const feedback: string[] = [];
    let quality = true;
    let score = 85;
    if (elbow > 95) { feedback.push('Lower your head a little farther if your neck feels comfortable.'); quality = false; score -= 10; }
    if (feedback.length === 0) feedback.push('Good controlled press. Keep your hips high.');
    return this.updateReps(state.phase, state.completed, quality, feedback.slice(0, 2), frame, clamp(score, 0, 100));
  }
}
