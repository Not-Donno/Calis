import type { Landmark, LandmarkName, PoseFrame } from './types';

/** MediaPipe Pose landmark indices used by the bundled pose model. */
export const MEDIAPIPE_POSE_INDICES: Record<LandmarkName, number> = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

export function mapMediaPipeLandmarks(points: { x: number; y: number; z: number; visibility?: number }[], timestamp: number, width: number, height: number): PoseFrame {
  const landmarks: PoseFrame['landmarks'] = {};
  for (const [name, index] of Object.entries(MEDIAPIPE_POSE_INDICES) as [LandmarkName, number][]) {
    const point = points[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const landmark: Landmark = { name, x: point.x, y: point.y, z: Number.isFinite(point.z) ? point.z : 0, visibility: point.visibility ?? 1 };
    landmarks[name] = landmark;
  }
  return { timestamp, width, height, landmarks };
}

export class LandmarkSmoother {
  private previous: PoseFrame['landmarks'] = {};
  constructor(private readonly alpha = 0.45) {}

  update(frame: PoseFrame): PoseFrame {
    const next: PoseFrame['landmarks'] = {};
    for (const [name, current] of Object.entries(frame.landmarks) as [LandmarkName, Landmark][]) {
      const prior = this.previous[name];
      next[name] = prior && current.visibility > 0.2 && prior.visibility > 0.2 ? {
        ...current,
        x: prior.x * (1 - this.alpha) + current.x * this.alpha,
        y: prior.y * (1 - this.alpha) + current.y * this.alpha,
        z: prior.z * (1 - this.alpha) + current.z * this.alpha,
        visibility: Math.min(prior.visibility, current.visibility),
      } : current;
    }
    this.previous = next;
    return { ...frame, landmarks: next };
  }

  reset(): void { this.previous = {}; }
}

export function hasVisibleLandmarks(frame: PoseFrame, names: LandmarkName[], threshold = 0.45): boolean {
  return names.every((name) => (frame.landmarks[name]?.visibility ?? 0) >= threshold);
}

export function midpoint(frame: PoseFrame, a: LandmarkName, b: LandmarkName): { x: number; y: number } | null {
  const first = frame.landmarks[a];
  const second = frame.landmarks[b];
  if (!first || !second || first.visibility < 0.4 || second.visibility < 0.4) return null;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}
