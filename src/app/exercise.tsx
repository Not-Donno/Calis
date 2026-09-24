import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Divider, IconButton, PrimaryButton, Screen, Tag } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { EXERCISE_BY_ID } from '@/data/program';

export default function ExerciseDetailScreen(): React.JSX.Element {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const exercise = exerciseId ? EXERCISE_BY_ID[exerciseId] : undefined;
  if (!exercise) return <Screen><AppText variant="heading">Exercise not found</AppText><PrimaryButton title="Go back" onPress={() => router.back()} style={styles.topButton} /></Screen>;
  const next = exercise.nextLevelId ? EXERCISE_BY_ID[exercise.nextLevelId] : undefined;

  return <Screen><View style={styles.header}><IconButton name="arrow-back" label="Go back" onPress={() => router.back()} /><View style={styles.headerActions} /></View><View style={styles.titleBlock}><View style={styles.icon}><Ionicons name={exercise.category === 'core' ? 'body-outline' : exercise.category === 'mobility' ? 'leaf-outline' : 'barbell-outline'} size={28} color={colors.background} /></View><AppText variant="caption" color={colors.lime} style={styles.eyebrow}>{exercise.muscles.join(' · ').toUpperCase()}</AppText><AppText variant="display">{exercise.name}</AppText><AppText color={colors.textSecondary} style={styles.description}>{exercise.instructions[0]}</AppText><View style={styles.tags}><Tag label={exercise.equipment} icon="briefcase-outline" /><Tag label={exercise.cameraSupported ? 'Form check available' : 'No camera needed'} color={exercise.cameraSupported ? colors.mint : colors.textSecondary} background={exercise.cameraSupported ? colors.mintDark : colors.surfaceSoft} icon={exercise.cameraSupported ? 'camera-outline' : 'checkmark-circle-outline'} /></View></View><Card style={styles.howCard}><AppText variant="heading">How to practice it</AppText>{exercise.instructions.slice(1).map((instruction, index) => <View key={instruction} style={styles.step}><View style={styles.stepNumber}><AppText variant="caption" color={colors.lime}>{index + 2}</AppText></View><AppText color={colors.textSecondary} style={styles.stepText}>{instruction}</AppText></View>)}<Divider /><AppText variant="label" color={colors.textSecondary}>COACHING CUES</AppText>{exercise.cues.map((cue) => <View key={cue} style={styles.cue}><Ionicons name="checkmark-circle" size={17} color={colors.mint} /><AppText color={colors.textSecondary} style={styles.stepText}>{cue}</AppText></View>)}</Card><Card style={styles.rangeCard}><View style={styles.rangeItem}><AppText variant="caption" color={colors.textSecondary}>SUGGESTED RANGE</AppText><AppText variant="title">{exercise.durationSec ? `${exercise.durationSec}s` : `${exercise.repMin}–${exercise.repMax}`}</AppText></View><View style={styles.rangeItem}><AppText variant="caption" color={colors.textSecondary}>REST AFTER SET</AppText><AppText variant="title">{exercise.restSeconds}s</AppText></View><View style={styles.rangeItem}><AppText variant="caption" color={colors.textSecondary}>LEVEL</AppText><AppText variant="title">{exercise.level + 1}<AppText variant="body" color={colors.textMuted}>/6</AppText></AppText></View></Card>{exercise.cameraSupported ? <PrimaryButton title="Open form check" icon="camera-outline" onPress={() => router.push({ pathname: '/camera', params: { exerciseId: exercise.id } })} style={styles.cameraButton} /> : null}<Card style={styles.progressionCard}><View style={styles.progressionIcon}><Ionicons name="trending-up-outline" size={19} color={colors.lime} /></View><View style={styles.progressionCopy}><AppText variant="subheading">Progress with control</AppText><AppText variant="caption" color={colors.textSecondary} style={styles.progressionText}>Reach the top of your range across multiple quality sessions before trying {next?.name ?? 'a harder variation'}. Keep 2–3 reps in reserve.</AppText></View></Card><AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>Calis provides general movement guidance, not medical or professional coaching. Stop if you feel pain.</AppText></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xxl },
  headerActions: { flexDirection: 'row' },
  titleBlock: { alignItems: 'center', gap: 8, marginBottom: spacing.xxl },
  icon: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, shadowColor: colors.lime, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  eyebrow: { textAlign: 'center', letterSpacing: 1.1 },
  description: { textAlign: 'center', maxWidth: 340, marginTop: 3, lineHeight: 23 },
  tags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  howCard: { gap: spacing.lg, backgroundColor: colors.surfaceRaised },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: { width: 30, height: 30, borderRadius: 12, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, lineHeight: 22 },
  cue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rangeCard: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingVertical: spacing.lg, backgroundColor: colors.surfaceTint },
  rangeItem: { flex: 1, gap: 4, alignItems: 'center' },
  cameraButton: { marginTop: spacing.lg },
  progressionCard: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.mintDark, borderColor: '#356A54' },
  progressionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#23483A', alignItems: 'center', justifyContent: 'center' },
  progressionCopy: { flex: 1, gap: 4 },
  progressionText: { marginTop: 2 },
  disclaimer: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg, lineHeight: 20 },
  topButton: { marginTop: spacing.xl },
});
