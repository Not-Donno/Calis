import { VisionCameraProxy } from 'react-native-vision-camera';
import type { Frame } from 'react-native-vision-camera';
import type { HandDetectionResult } from 'expo-vision-camera-v4-mediapipe';

// VisionCamera v4 exposes native frame processors through this proxy. The
// package's README mentions a global function, but the supported v4 API is to
// initialize the registered plugin once and call it from a worklet.
const handLandmarkerPlugin = VisionCameraProxy.initFrameProcessorPlugin('handLandmarker', {});

export function detectHandLandmarks(frame: Frame): HandDetectionResult {
  'worklet';
  if (!handLandmarkerPlugin) {
    throw new Error('The native handLandmarker frame processor is unavailable.');
  }
  return handLandmarkerPlugin.call(frame) as unknown as HandDetectionResult;
}
