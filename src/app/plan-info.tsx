import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, Screen, SectionHeader, Tag } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { PROGRAM_NOTES, WORKOUT_DAYS } from '@/data/program';

export default function PlanInfoScreen(): React.JSX.Element {
  return <Screen><View style={styles.header}><IconButton name="arrow-back" label="Go back" onPress={() => router.back()} /><AppText variant="title" style={styles.headerTitle}>About this plan</AppText><View style={styles.spacer} /></View><Card style={styles.intro}><Tag label="EVIDENCE-INFORMED" color={colors.lime} background={colors.limeDark} icon="sparkles-outline" /><AppText variant="title" style={styles.introTitle}>A simple place to begin.</AppText><AppText color={colors.textSecondary}>This is one beginner structure, not the only scientifically valid split. It emphasizes manageable volume, progressive resistance, technique, recovery, and regular aerobic activity.</AppText></Card><SectionHeader title="Your principles" /><Card style={styles.principles}>{PROGRAM_NOTES.map((note, index) => <View key={note} style={styles.principle}><View style={styles.number}><AppText variant="caption" color={colors.lime}>{String(index + 1).padStart(2, '0')}</AppText></View><AppText color={colors.textSecondary} style={styles.principleText}>{note}</AppText></View>)}</Card><SectionHeader title="Weekly rhythm" /><Card style={styles.days}>{WORKOUT_DAYS.map((day) => <View key={day.key} style={styles.day}><View style={[styles.dayDot, { backgroundColor: day.isRest ? colors.mint : colors.lime }]} /><View style={styles.dayCopy}><AppText variant="label">{day.title}</AppText><AppText variant="caption" color={colors.textMuted}>{day.isRest ? 'Recovery' : day.focus}</AppText></View><AppText variant="caption" color={colors.textMuted}>{day.isRest ? '—' : `${day.durationMinutes} min`}</AppText></View>)}</Card><AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>Training guidance is general and not a substitute for a qualified coach or medical professional. Stop if an exercise causes pain.</AppText></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerTitle: { flex: 1, textAlign: 'center' },
  spacer: { width: 42 },
  intro: { gap: spacing.lg },
  introTitle: { marginTop: spacing.sm },
  principles: { gap: spacing.lg },
  principle: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  principleText: { flex: 1 },
  days: { gap: spacing.md },
  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayCopy: { flex: 1, gap: 2 },
  disclaimer: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
