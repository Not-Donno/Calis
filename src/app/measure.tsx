import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, InputField, PrimaryButton, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { saveMeasurement } from '@/db/repositories';
import { formatDateKey } from '@/data/program';
import { useAppData } from '@/hooks/useAppData';

export default function MeasureScreen(): React.JSX.Element {
  const { settings } = useAppData();
  const unitSystem = settings?.units ?? 'metric';
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save(): Promise<void> {
    const enteredWeight = Number(weight);
    const enteredWaist = waist ? Number(waist) : undefined;
    const weightKg = unitSystem === 'imperial' ? enteredWeight / 2.2046226218 : enteredWeight;
    const waistCm = enteredWaist === undefined ? undefined : unitSystem === 'imperial' ? enteredWaist * 2.54 : enteredWaist;
    if (weight && (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300)) { setError(`Enter a valid weight in ${unitSystem === 'imperial' ? 'lb' : 'kg'}.`); return; }
    if (waistCm !== undefined && (!Number.isFinite(waistCm) || waistCm < 30 || waistCm > 250)) { setError(`Enter a valid waist measurement in ${unitSystem === 'imperial' ? 'in' : 'cm'}.`); return; }
    setSaving(true);
    try { await saveMeasurement({ date: formatDateKey(new Date()), weightKg: weight ? weightKg : undefined, waistCm, notes: notes.trim() || undefined }); router.back(); } catch { setError('Could not save this check-in locally.'); } finally { setSaving(false); }
  }
  return <Screen><View style={styles.header}><IconButton name="arrow-back" label="Go back" onPress={() => router.back()} /><AppText variant="title" style={styles.headerTitle}>Body check-in</AppText><View style={styles.spacer} /></View><AppText color={colors.textSecondary} style={styles.intro}>Optional measurements help you notice trends. They are never used to diagnose anything.</AppText><Card style={styles.card}><InputField label={unitSystem === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'} placeholder={unitSystem === 'imperial' ? '154.0' : '70.0'} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} /><InputField label={unitSystem === 'imperial' ? 'Waist (in)' : 'Waist (cm)'} placeholder="Optional" keyboardType="decimal-pad" value={waist} onChangeText={setWaist} /><InputField label="Note" placeholder="Optional context" value={notes} onChangeText={setNotes} multiline />{error ? <AppText color={colors.coral}>{error}</AppText> : null}<PrimaryButton title="Save check-in" onPress={() => void save()} loading={saving} icon="checkmark" /></Card><AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>Calis is a fitness tool, not a medical device. Discuss health concerns with a qualified professional.</AppText></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerTitle: { flex: 1, textAlign: 'center' },
  spacer: { width: 42 },
  intro: { marginBottom: spacing.xl },
  card: { gap: spacing.lg },
  disclaimer: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
