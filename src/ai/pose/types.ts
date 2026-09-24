export type LandmarkName = 'nose' | 'leftShoulder' | 'rightShoulder' | 'leftElbow' | 'rightElbow' | 'leftWrist' | 'rightWrist' | 'leftHip' | 'rightHip' | 'leftKnee' | 'rightKnee' | 'leftAnkle' | 'rightAnkle';

export interface Landmark {
  name: LandmarkName;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  timestamp: number;
  width: number;
  height: number;
  landmarks: Partial<Record<LandmarkName, Landmark>>;
}

export interface PoseDetector {
  readonly id: string;
  readonly available: boolean;
  initialize(): Promise<void>;
  processFrame(frame: PoseFrame): void;
  stop(): Promise<void>;
}

export type MovementPhase = 'up' | 'going_down' | 'bottom' | 'going_up';

export interface AnalyzerUpdate {
  exerciseId: string;
  phase: MovementPhase;
  reps: number;
  goodReps: number;
  formScore?: number;
  feedback: string[];
  landmarks: PoseFrame;
  isEstimate: true;
}
