import type { Landmark, LandmarkName, PoseFrame } from './types';

export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: b.x - c.x, y: b.y - c.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magnitude = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!magnitude) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / magnitude))) * 180 / Math.PI;
}

export function jointAngle(frame: PoseFrame, a: LandmarkName, b: LandmarkName, c: LandmarkName): number | null {
  const first = frame.landmarks[a];
  const middle = frame.landmarks[b];
  const last = frame.landmarks[c];
  if (!first || !middle || !last || first.visibility < 0.4 || middle.visibility < 0.4 || last.visibility < 0.4) return null;
  return angleAt(first, middle, last);
}

export function lineAngle(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

export function bodyLineAngle(frame: PoseFrame): number | null {
  const shoulder = averagePoint(frame, 'leftShoulder', 'rightShoulder');
  const hip = averagePoint(frame, 'leftHip', 'rightHip');
  if (!shoulder || !hip) return null;
  const raw = Math.abs(lineAngle(shoulder, hip)) % 180;
  // A side-view body can be vertical (push-up/pull-up) or horizontal
  // (plank/lunge). Report deviation from the nearest body axis rather than
  // treating a correctly horizontal line as a 90° error.
  return Math.min(raw, Math.abs(raw - 90), 180 - raw);
}

export function averagePoint(frame: PoseFrame, a: LandmarkName, b: LandmarkName): { x: number; y: number } | null {
  const first = frame.landmarks[a];
  const second = frame.landmarks[b];
  if (!first || !second || first.visibility < 0.4 || second.visibility < 0.4) return null;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
