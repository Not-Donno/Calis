const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');
const withHandLandmarker = require('expo-vision-camera-v4-mediapipe/plugin');

// Keep the frame processor on the newest camera frame. The default
// BLOCK_PRODUCER strategy queues frames while MediaPipe is inferring, which
// eventually exhausts CameraX's ImageReader buffer on slower Android phones.
function withVisionCameraBackpressure(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const target = path.join(
        mod.modRequest.projectRoot,
        'node_modules',
        'react-native-vision-camera',
        'android',
        'src',
        'main',
        'java',
        'com',
        'mrousavy',
        'camera',
        'core',
        'CameraSession+Configuration.kt'
      );

      if (fs.existsSync(target)) {
        const source = fs.readFileSync(target, 'utf8');
        const updated = source.replace(
          'ImageAnalysis.STRATEGY_BLOCK_PRODUCER',
          'ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST'
        );
        if (updated !== source) fs.writeFileSync(target, updated);
      } else {
        console.warn('[Calis] VisionCamera backpressure target was not found; skipping patch.');
      }

      const packageName = mod.android?.package || 'com.calis.app';
      const kotlinTarget = path.join(
        mod.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        ...packageName.split('.'),
        'HandLandmarkerPlugin.kt'
      );
      if (fs.existsSync(kotlinTarget)) {
        const source = fs.readFileSync(kotlinTarget, 'utf8');
        const updated = source
          .replace('Orientation.LANDSCAPE_LEFT -> 90f', 'Orientation.LANDSCAPE_LEFT -> 270f')
          .replace('Orientation.LANDSCAPE_RIGHT -> 270f', 'Orientation.LANDSCAPE_RIGHT -> 90f');
        if (updated !== source) fs.writeFileSync(kotlinTarget, updated);
      }
      return mod;
    }
  ]);
}

// The package publishes its config plugin at ./plugin, while its main entry
// exports runtime constants. Expo's resolver follows package.json main, so we
// expose the actual plugin function through this stable local entry point.
module.exports = (config, options) => withHandLandmarker(withVisionCameraBackpressure(config), options);
