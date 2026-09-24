import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, IconButton, PrimaryButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { EXERCISE_BY_ID } from '@/data/program';
import { useAppData } from '@/hooks/useAppData';
import { createExerciseAnalyzer, type ExerciseAnalyzer } from '@/ai/exercises';
import { mapMediaPipeLandmarks } from '@/ai/pose/landmarkMap';
import { detectHandLandmarks } from '@/ai/pose/handLandmarker';
import type { AnalyzerUpdate, Landmark, PoseFrame } from '@/ai/pose/types';
import type { HandDetectionResult } from 'expo-vision-camera-v4-mediapipe';

export default function CameraScreen(): React.JSX.Element {
  const { exerciseId = 'incline-push-up', setNumber = '1', returnTo } = useLocalSearchParams<{ exerciseId?: string; setNumber?: string; returnTo?: string }>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const exercise = (EXERCISE_BY_ID[exerciseId] ?? EXERCISE_BY_ID['incline-push-up'])!;
  const { settings, updateAppSettings } = useAppData();
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const [viewMode, setViewMode] = useState<'front' | 'side'>(() => settings?.cameraPreferredView === 'side' ? 'side' : 'front');
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [modelStatus, setModelStatus] = useState<'idle' | 'ready' | 'searching' | 'error' | 'unsupported'>(() => Platform.OS === 'android' ? 'searching' : 'unsupported');
  const [analysis, setAnalysis] = useState<AnalyzerUpdate | null>(null);
  const [latestFrame, setLatestFrame] = useState<PoseFrame | null>(null);
  const [manualReps, setManualReps] = useState('');
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const analyzerRef = useRef<ExerciseAnalyzer | null>(null);
  const lastUpdateRef = useRef(0);
  const lastRepRef = useRef(0);
  const soundEnabledRef = useRef(settings?.soundEnabled ?? true);
  const lastCueAtRef = useRef(0);
  const bodyCueRef = useRef(false);
  const soundEnabled = settings?.soundEnabled ?? true;

  useEffect(() => {
    soundEnabledRef.current = settings?.soundEnabled ?? true;
  }, [settings?.soundEnabled]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    soundEnabledRef.current = next;
    if (!next) Speech.stop();
    void updateAppSettings({ soundEnabled: next }).catch(() => {
      soundEnabledRef.current = soundEnabled;
    });
  }, [soundEnabled, updateAppSettings]);

  const speakCue = useCallback((text: string) => {
    const now = Date.now();
    if (!soundEnabledRef.current || now - lastCueAtRef.current < 2200) return;
    lastCueAtRef.current = now;
    try {
      Speech.speak(text, { language: 'en-US', pitch: 1, rate: 0.92 });
    } catch {
      // Audio is an enhancement; camera analysis continues if TTS is unavailable.
    }
  }, []);

  const resetLiveAnalysis = useCallback(() => {
    setCameraError(undefined);
    setAnalysis(null);
    setLatestFrame(null);
    bodyCueRef.current = false;
    lastRepRef.current = 0;
    setModelStatus(Platform.OS === 'android' ? 'searching' : 'unsupported');
  }, []);

  const switchCamera = useCallback(() => {
    const nextPosition = cameraPosition === 'front' ? 'back' : 'front';
    setCameraPosition(nextPosition);
    resetLiveAnalysis();
    speakCue(`Switching to the ${nextPosition === 'front' ? 'front' : 'rear'} camera.`);
  }, [cameraPosition, resetLiveAnalysis, speakCue]);

  const toggleViewMode = useCallback(() => {
    const nextView = viewMode === 'front' ? 'side' : 'front';
    setViewMode(nextView);
    void updateAppSettings({ cameraPreferredView: nextView }).catch(() => undefined);
    resetLiveAnalysis();
    speakCue(`Switching to ${nextView} view.`);
  }, [resetLiveAnalysis, speakCue, updateAppSettings, viewMode]);

  useEffect(() => {
    analyzerRef.current = createExerciseAnalyzer(exerciseId) ?? null;
    return () => { analyzerRef.current = null; };
  }, [exerciseId]);

  const handlePose = useCallback((result: HandDetectionResult) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;
    if (result.poseError || result.error) {
      bodyCueRef.current = false;
      setModelStatus('error');
      setAnalysis(null);
      setLatestFrame(null);
      speakCue('Check your full body in the frame.');
      return;
    }
    if (!result.pose || result.pose.length === 0) {
      bodyCueRef.current = false;
      setModelStatus('searching');
      setAnalysis(null);
      setLatestFrame(null);
      if (now - lastCueAtRef.current > 7000) speakCue('Step back until your full body is visible.');
      return;
    }
    const frame = mapMediaPipeLandmarks(result.pose, now, result.imageWidth ?? 1, result.imageHeight ?? 1);
    setLatestFrame(frame);
    setModelStatus('ready');
    if (!bodyCueRef.current) {
      bodyCueRef.current = true;
      speakCue('Great, keep your full body in frame.');
    }
    const update = analyzerRef.current?.analyze(frame);
    if (update) {
      setAnalysis(update);
      if (update.reps > lastRepRef.current) {
        lastRepRef.current = update.reps;
        speakCue('Nice rep.');
      }
    }
  }, [speakCue]);

  const analyzerAvailable = useMemo(() => createExerciseAnalyzer(exerciseId) !== null, [exerciseId]);
  // The worklet bridge intentionally owns the mutable pose/analyzer refs.
  // eslint-disable-next-line react-hooks/refs
  const runOnJS = useMemo(() => Worklets.createRunOnJS(handlePose), [handlePose]);
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const result = detectHandLandmarks(frame);
    if (result) runOnJS(result);
  }, [runOnJS]);

  async function beginCamera(): Promise<void> {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Camera permission denied', 'Calis cannot analyze movement without camera access. No frames are stored.', [{ text: 'Not now', style: 'cancel' }, { text: 'Open settings', onPress: () => { void Linking.openSettings(); } }]);
        return;
      }
    }
    setCameraError(undefined);
    bodyCueRef.current = false;
    lastRepRef.current = 0;
    lastCueAtRef.current = 0;
    setCameraStarted(true);
    speakCue('Camera ready. Keep your full body in frame.');
  }

  function saveResult(): void {
    const hasManualValue = manualReps.trim().length > 0;
    const reps = hasManualValue ? Number(manualReps.trim()) : (analysis?.reps ?? 0);
    if (!Number.isInteger(reps) || reps < 1) {
      Alert.alert('Check your result', `Enter a whole number greater than zero${isDuration ? ' of seconds' : ''}.`);
      return;
    }
    const params = { formReps: String(reps), formExerciseId: exerciseId, formSet: setNumber, ...(!hasManualValue ? { formGoodReps: String(Math.min(reps, analysis?.goodReps ?? reps)), ...(analysis?.formScore !== undefined ? { formScore: String(Math.round(analysis.formScore)) } : {}), ...(analysis?.feedback.length ? { formFeedback: analysis.feedback.join(' · ') } : {}) } : {}) };
    speakCue('Result saved.');
    if (returnTo) router.replace({ pathname: returnTo, params } as never);
    else router.back();
  }

  const score = analysis?.formScore;
  const viewLabel = viewMode === 'front' ? 'Front view' : 'Side view';
  const viewModeLabel = viewMode === 'front' ? 'FRONT VIEW' : 'SIDE VIEW';
  const cameraModeLabel = cameraPosition === 'front' ? 'FRONT CAMERA' : 'REAR CAMERA';
  const isDuration = exercise.durationSec !== undefined;
  const resultUnit = isDuration ? 'sec' : 'reps';
  const previewMessage = cameraError ? `Camera unavailable: ${cameraError}` : !device ? 'No camera was found on this device. You can still enter a result manually.' : cameraStarted && Platform.OS !== 'android' ? 'On-device pose analysis is currently optimized for Android development builds.' : 'Camera preview stays on this device.';

  return <View style={styles.root} onLayout={(event) => setLayout(event.nativeEvent.layout)}><View style={styles.preview}>{cameraStarted && hasPermission && device && Platform.OS === 'android' ? <Camera style={StyleSheet.absoluteFill} device={device} isActive={isFocused && cameraStarted} pixelFormat="rgb" resizeMode="cover" androidPreviewViewType="texture-view" frameProcessor={frameProcessor} onError={(error) => { setCameraError(error.message); setCameraStarted(false); }} /> : <View style={styles.previewFallback}><Ionicons name="videocam-outline" size={54} color={colors.textMuted} /><AppText color={colors.textSecondary} style={styles.previewText}>{previewMessage}</AppText></View>}{cameraStarted && <PoseOverlay frame={latestFrame} width={layout.width} height={layout.height} mirror={cameraPosition === 'front'} />}</View><View style={styles.header}><IconButton name="close" label="Close camera" onPress={() => router.back()} /><View style={styles.headerCopy}><AppText variant="label" style={styles.overlayText}>FORM CHECK</AppText><AppText variant="caption" color={colors.text} style={styles.overlayText}>{exercise.name}</AppText></View><View style={styles.headerActions}><IconButton name={soundEnabled ? 'volume-high' : 'volume-mute'} label={soundEnabled ? 'Mute audio cues' : 'Unmute audio cues'} color={soundEnabled ? colors.lime : colors.textMuted} onPress={toggleSound} style={styles.overlayIconButton} /><View style={styles.localBadge}><Ionicons name="lock-closed" size={12} color={colors.mint} /><AppText variant="caption" color={colors.mint} style={styles.overlayText}>ON DEVICE</AppText></View></View></View><View pointerEvents="box-none" style={styles.modeControls}><ModeControl icon="eye-outline" title={viewModeLabel} accessibilityLabel={`Switch to ${viewMode === 'front' ? 'side' : 'front'} view`} hint="Changes guidance orientation only; it does not change the physical lens." onPress={toggleViewMode} /><ModeControl icon="camera-reverse-outline" title={cameraModeLabel} accessibilityLabel={`Select ${cameraPosition === 'front' ? 'rear' : 'front'} camera`} hint="Changes the physical lens only; it does not change guidance orientation." onPress={switchCamera} /></View>{!cameraStarted ? <View pointerEvents="box-none" style={styles.startOverlay}><PrimaryButton title="Start camera" onPress={() => void beginCamera()} icon="camera-outline" style={styles.startButton} /></View> : null}<View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}><Card style={styles.guideCard}><View style={styles.guideHeader}><View style={styles.guideIcon}><Ionicons name="body-outline" size={20} color={colors.lime} /></View><View style={styles.guideCopy}><AppText variant="subheading" style={styles.overlayText}>Set up your view</AppText><AppText variant="caption" color={colors.text} style={styles.overlayText}>{viewLabel} recommended</AppText></View><AppText variant="caption" color={colors.lime} style={styles.overlayText}>{viewMode === 'front' ? 'FRONT' : 'SIDE'}</AppText></View><View style={styles.guideGrid}><GuideItem icon="move-outline" text="Keep your full body in frame" /><GuideItem icon="sunny-outline" text="Use even, indirect light" /><GuideItem icon="resize-outline" text="Leave 1–2 m of space" /></View>{cameraStarted ? <View style={styles.liveRow}><View style={[styles.statusDot, { backgroundColor: modelStatus === 'ready' ? colors.mint : modelStatus === 'error' ? colors.coral : colors.amber }]} /><AppText variant="caption" color={colors.text} style={styles.overlayText}>{modelStatus === 'ready' ? 'Body detected · analyzing locally' : modelStatus === 'error' ? 'Pose model needs attention' : modelStatus === 'unsupported' ? 'Preview only on this platform' : 'Looking for your body…'}</AppText></View> : null}</Card>{cameraStarted && <Card style={styles.resultCard}><View style={styles.resultHeader}><View><AppText variant="caption" color={colors.text} style={styles.overlayText}>LIVE MOVEMENT</AppText><AppText variant="title" style={styles.overlayText}>{analysis?.reps ?? 0} <AppText variant="body" color={colors.text} style={styles.overlayText}>{resultUnit}</AppText></AppText></View>{score !== undefined ? <View style={styles.score}><AppText variant="caption" color={colors.textMuted}>FORM ESTIMATE</AppText><AppText variant="heading" color={score >= 75 ? colors.mint : colors.amber}>{score}%</AppText></View> : null}</View>{analysis?.feedback?.length ? <View style={styles.feedback}>{analysis.feedback.map((item) => <View key={item} style={styles.feedbackRow}><Ionicons name="information-circle-outline" size={15} color={colors.lime} /><AppText variant="caption" color={colors.textSecondary} style={styles.feedbackText}>{item}</AppText></View>)}</View> : null}<View style={styles.manualRow}><AppText variant="caption" color={colors.textSecondary}>Actual {resultUnit} to save</AppText><TextInput accessibilityLabel="Actual repetitions" value={manualReps} onChangeText={setManualReps} keyboardType="number-pad" placeholder={String(analysis?.reps || exercise.durationSec || '')} placeholderTextColor={colors.textMuted} style={styles.repsInput} /></View><PrimaryButton title="Use this result" onPress={saveResult} disabled={!analyzerAvailable && !manualReps} icon="checkmark" style={styles.useButton} /><AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>Estimated feedback only. It is not medical advice and does not replace a qualified coach.</AppText></Card>}</View>{!hasPermission && cameraStarted ? <View style={styles.permissionOverlay}><Card style={styles.permissionCard}><Ionicons name="camera-outline" size={28} color={colors.lime} /><AppText variant="heading">Camera permission needed</AppText><AppText color={colors.textSecondary} style={styles.permissionCopy}>Calis only uses the camera while this form check is open. Frames are processed in memory and never saved.</AppText><PrimaryButton title="Allow camera" onPress={() => void beginCamera()} icon="camera-outline" /></Card></View> : null}</View>;
}

function ModeControl({ icon, title, accessibilityLabel, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; accessibilityLabel: string; hint: string; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={hint} onPress={onPress} style={({ pressed }) => [styles.modeControl, pressed && styles.overlayPressed]}><View style={styles.modeControlSurface}><Ionicons name={icon} size={16} color={colors.lime} /><AppText variant="caption" color={colors.text} style={styles.overlayText}>{title}</AppText></View></Pressable>;
}

function GuideItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }): React.JSX.Element { return <View style={styles.guideItem}><Ionicons name={icon} size={16} color={colors.lime} /><AppText variant="caption" color={colors.text} style={styles.guideItemText}>{text}</AppText></View>; }

function projectLandmark(point: Landmark, frame: PoseFrame, width: number, height: number, mirror: boolean): { x: number; y: number } {
  const imageWidth = frame.width > 0 ? frame.width : 1;
  const imageHeight = frame.height > 0 ? frame.height : 1;
  // Camera uses cover resize by default: scale the image until it fills the
  // view, then center the cropped overflow before applying the selfie mirror.
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  const x = offsetX + point.x * renderedWidth;
  const y = offsetY + point.y * renderedHeight;
  return { x: mirror ? width - x : x, y };
}

function PoseOverlay({ frame, width, height, mirror }: { frame: PoseFrame | null; width: number; height: number; mirror: boolean }): React.JSX.Element | null {
  if (!frame) return null;
  const projected = new Map<string, { x: number; y: number }>();
  for (const point of Object.values(frame.landmarks)) {
    if (point && point.visibility >= 0.35) projected.set(point.name, projectLandmark(point, frame, width, height, mirror));
  }
  const connections: [string, string][] = [['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'], ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'], ['leftHip', 'rightHip'], ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'], ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle']];
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.poseOverlay]}>{connections.map(([a, b]) => { const first = projected.get(a); const second = projected.get(b); if (!first || !second) return null; const length = Math.hypot(second.x - first.x, second.y - first.y); const angle = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI; return <View key={`${a}-${b}`} style={[styles.line, { left: (first.x + second.x) / 2 - length / 2, top: (first.y + second.y) / 2 - 1, width: length, transform: [{ rotate: `${angle}deg` }] }]} />; })}{Array.from(projected.entries()).map(([name, point]) => <View key={name} style={[styles.point, { left: point.x - 5, top: point.y - 5 }]} />)}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  preview: { ...StyleSheet.absoluteFill, backgroundColor: '#080A0C' },
  previewFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, gap: spacing.md },
  previewText: { textAlign: 'center' },
  header: { position: 'absolute', top: 52, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { alignItems: 'center', gap: 2 },
  overlayIconButton: { backgroundColor: 'rgba(12,17,16,0.78)', borderColor: 'rgba(209,244,119,0.55)', shadowOpacity: 0, elevation: 0 },
  localBadge: { minHeight: 34, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(12,17,16,0.68)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeControls: { position: 'absolute', top: 174, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, zIndex: 12, elevation: 12 },
  modeControl: { minHeight: 48 },
  modeControlSurface: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: 'rgba(12,17,16,0.78)', borderWidth: 1, borderColor: 'rgba(209,244,119,0.48)' },
  overlayPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  startOverlay: { position: 'absolute', top: 238, left: spacing.xl, right: spacing.xl, zIndex: 20, elevation: 20 },
  startButton: { elevation: 20 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, paddingBottom: 18, gap: spacing.sm, backgroundColor: 'transparent' },
  guideCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(12,17,16,0.72)', borderWidth: 1, borderColor: 'rgba(209,244,119,0.32)', borderRadius: radii.md, shadowOpacity: 0, elevation: 0 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guideIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  guideCopy: { flex: 1, gap: 2 },
  guideGrid: { gap: 2 },
  guideItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guideItemText: { flex: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  liveRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  resultCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(12,17,16,0.78)', borderWidth: 1, borderColor: 'rgba(141,225,181,0.38)', borderRadius: radii.md, shadowOpacity: 0, elevation: 0 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { alignItems: 'flex-end', gap: 2 },
  feedback: { gap: 4, paddingVertical: 4 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedbackText: { flex: 1 },
  manualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  repsInput: { width: 88, minHeight: 40, borderRadius: 12, backgroundColor: 'rgba(24,33,30,0.88)', color: colors.text, paddingHorizontal: spacing.md, fontSize: 16, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  useButton: { minHeight: 48 },
  disclaimer: { textAlign: 'center', paddingHorizontal: spacing.sm, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  overlayText: { textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  permissionOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permissionCard: { width: '100%', alignItems: 'center', gap: spacing.lg },
  permissionCopy: { textAlign: 'center' },
  poseOverlay: { zIndex: 10, elevation: 10 },
  line: { position: 'absolute', height: 2, backgroundColor: colors.lime, opacity: 0.85, borderRadius: 1 },
  point: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lime },
});
