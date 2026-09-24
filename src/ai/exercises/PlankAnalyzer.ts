import { bodyLineAngle, clamp } from '@/ai/pose/geometry';
import { hasVisibleLandmarks } from '@/ai/pose/landmarkMap';
import type { PoseFrame } from '@/ai/pose/types';
import { ExerciseAnalyzer } from './BaseAnalyzer';

export class PlankAnalyzer extends ExerciseAnalyzer {
  analyze(rawFrame: PoseFrame) {
    const required = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'] as const;
    if (!hasVisibleLandmarks(rawFrame, [...required])) return this.missing([...required], rawFrame);
    const frame = this.frame(rawFrame);
    const line = bodyLineAngle(frame);
    if (line === null) return this.missing(['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'], frame);
    const score = clamp(Math.round(100 - Math.max(0, line - 8) * 2.2), 0, 100);
    const feedback = line > 16 ? ['Keep your hips aligned.', 'Reduce the load on your lower back.'] : ['Good alignment. Keep breathing.'];
    return { exerciseId: this.exerciseId, phase: this.phase, reps: this.reps, goodReps: this.goodReps, formScore: score, feedback, landmarks: frame, isEstimate: true as const };
  }
}
