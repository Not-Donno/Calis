import { Platform } from 'react-native';

import type { PoseDetector } from './types';

/**
 * The native pose adapter is supplied by the development-build frame processor
 * in the camera screen. Keeping this contract separate means the UI never
 * depends on a cloud service or a fake landmark stream.
 */
export class LocalPoseDetector implements PoseDetector {
  readonly id = 'mediapipe-pose-landmarker-lite';
  readonly available = Platform.OS === 'android';
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.available) throw new Error('On-device pose detection is currently enabled for Android development builds.');
    this.initialized = true;
  }

  processFrame(): void {
    if (!this.initialized) throw new Error('Pose detector has not been initialized.');
  }

  async stop(): Promise<void> {
    this.initialized = false;
  }
}

export function createPoseDetector(): PoseDetector {
  return new LocalPoseDetector();
}
