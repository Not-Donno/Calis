import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, Card, Divider, IconButton, InputField, PrimaryButton, Screen, SectionHeader, Tag, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { pickAndImportBackup, shareBackup } from '@/services/backup';
import { resetAllData } from '@/db/repositories';
import { useAppData } from '@/hooks/useAppData';
import type { NutritionTargets } from '@/types';
import { formatHeight, formatNumber, formatWeight } from '@/utils/format';

export default function SettingsScreen(): React.JSX.Element {
  const { profile, settings, targets, updateAppSettings, updateTargets, refresh } = useAppData();
  const [busy, setBusy] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState<NutritionTargets | null>(null);

  useFocusEffect(useCallback(() => { if (targets) setTargetDraft(targets); }, [targets]));

  async function exportData(): Promise<void> {
    setBusy('export');
    try { await shareBackup(); } catch (error) { Alert.alert('Export failed', error instanceof Error ? error.message : 'Could not create a backup.'); } finally { setBusy(null); }
  }

  async function importData(): Promise<void> {
    Alert.alert('Import backup?', 'Importing replaces the current local Calis data. Export a backup first if you want to keep it.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Choose file', onPress: () => void (async () => { setBusy('import'); try { const result = await pickAndImportBackup(); if (result.imported) { await refresh(); Alert.alert('Backup restored', 'Your local Calis data has been restored.'); } } catch (error) { Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not restore this backup.'); } finally { setBusy(null); } })() }]);
  }

  async function resetData(): Promise<void> {
    Alert.alert('Reset all Calis data?', 'This permanently removes your profile, workouts, nutrition logs, custom foods, and measurements from this device. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset everything', style: 'destructive', onPress: () => void (async () => { setBusy('reset'); try { await resetAllData(); await refresh(); router.replace('/onboarding'); } catch (error) { Alert.alert('Reset failed', error instanceof Error ? error.message : 'Could not reset local data.'); } finally { setBusy(null); } })() }]);
  }

  async function saveTargets(): Promise<void> {
    if (!targetDraft) return;
    setBusy('targets');
    try { await updateTargets({ ...targetDraft, updatedAt: new Date().toISOString() }); setEditingTargets(false); } catch { Alert.alert('Could not save targets', 'Your local targets were not changed.'); } finally { setBusy(null); }
  }

  if (!profile || !settings || !targets || !targetDraft) return <Screen><AppText color={colors.textSecondary}>Loading settings…</AppText></Screen>;
  return <Screen><View style={styles.header}><View><AppText variant="caption" color={colors.lime}>MAKE IT YOURS</AppText><AppText variant="title">Settings</AppText></View><IconButton name="shield-checkmark-outline" label="Privacy information" onPress={() => Alert.alert('Private by design', 'Calis stores your profile, workouts, nutrition, and measurements in a local SQLite database. Android cloud backup is disabled. Camera frames are processed in memory and are not stored or uploaded.')} /></View><Card style={styles.profileCard} onPress={() => router.push('/profile')} accessibilityLabel="Edit profile"><View style={styles.profileAvatar}><AppText variant="title" color={colors.background}>{profile.name.slice(0, 1).toUpperCase()}</AppText></View><View style={styles.profileCopy}><AppText variant="heading">{profile.name}</AppText><AppText variant="caption" color={colors.textSecondary}>{profile.age} years · {formatWeight(profile.weightKg, settings.units)} · {formatHeight(profile.heightCm, settings.units)} · {profile.trainingFrequency} training days/week</AppText><Tag label={profile.goal === 'gain' ? 'BUILD MUSCLE' : profile.goal === 'lose' ? 'LOSE BODY FAT' : 'MAINTAIN'} color={colors.mint} background={colors.mintDark} icon="flag-outline" /></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Card><SectionHeader title="Preferences" /><Card style={styles.preferenceCard}><Preference icon="swap-horizontal-outline" title="Units" detail={settings.units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, in)'} onPress={() => void updateAppSettings({ units: settings.units === 'metric' ? 'imperial' : 'metric' })} /><Divider /><TogglePreference icon={settings.soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'} title="Audio cues" detail={settings.soundEnabled ? 'Spoken form cues are on.' : 'Muted — visual guidance still works.'} value={settings.soundEnabled} onValueChange={(value) => void updateAppSettings({ soundEnabled: value })} /><Divider /><Preference icon="camera-outline" title="Preferred camera view" detail={settings.cameraPreferredView === 'side' ? 'Side view' : settings.cameraPreferredView === 'front' ? 'Front view' : '45-degree view'} onPress={() => void updateAppSettings({ cameraPreferredView: settings.cameraPreferredView === 'side' ? 'front' : settings.cameraPreferredView === 'front' ? 'three-quarter' : 'side' })} /><Divider /><TogglePreference icon="notifications-outline" title="Reminders" detail="Preference saved locally; scheduling is not enabled yet." value={settings.notificationsEnabled} onValueChange={(value) => void updateAppSettings({ notificationsEnabled: value })} /><Divider /><TogglePreference icon="phone-portrait-outline" title="Haptics" detail="Small tactile confirmations during training." value={settings.hapticsEnabled} onValueChange={(value) => void updateAppSettings({ hapticsEnabled: value })} /></Card><SectionHeader title="Nutrition targets" action={editingTargets ? undefined : 'Adjust'} onAction={() => setEditingTargets(true)} /><Card style={styles.targetsCard}><View style={styles.targetIntro}><View><AppText variant="caption" color={colors.textSecondary}>DAILY ESTIMATE</AppText><AppText variant="title">{formatNumber(editingTargets ? targetDraft.calories : targets.calories)} kcal</AppText></View><Tag label="EDITABLE" color={colors.amber} background={colors.surfaceSoft} icon="options-outline" /></View>{editingTargets ? <View style={styles.editTargets}><TargetInput label="Calories" value={targetDraft.calories} onChange={(calories) => setTargetDraft({ ...targetDraft, calories })} /><TargetInput label="Protein (g)" value={targetDraft.protein} onChange={(protein) => setTargetDraft({ ...targetDraft, protein })} /><TargetInput label="Carbs (g)" value={targetDraft.carbs} onChange={(carbs) => setTargetDraft({ ...targetDraft, carbs })} /><TargetInput label="Fat (g)" value={targetDraft.fat} onChange={(fat) => setTargetDraft({ ...targetDraft, fat })} /><TargetInput label="Fiber (g)" value={targetDraft.fiber} onChange={(fiber) => setTargetDraft({ ...targetDraft, fiber })} /><View style={styles.editActions}><TextButton title="Cancel" onPress={() => { setTargetDraft(targets); setEditingTargets(false); }} /><PrimaryButton title="Save targets" onPress={() => void saveTargets()} loading={busy === 'targets'} style={styles.saveTarget} /></View></View> : <View style={styles.targetMacros}><View><AppText variant="caption" color={colors.textSecondary}>PROTEIN</AppText><AppText variant="subheading">{targets.protein}g</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>CARBS</AppText><AppText variant="subheading">{targets.carbs}g</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>FAT</AppText><AppText variant="subheading">{targets.fat}g</AppText></View><View><AppText variant="caption" color={colors.textSecondary}>FIBER</AppText><AppText variant="subheading">{targets.fiber}g</AppText></View></View>}</Card><SectionHeader title="Your data" /><Card style={styles.dataCard}><DataAction icon="download-outline" title="Export backup" detail="Save a JSON copy of your local data." onPress={() => void exportData()} loading={busy === 'export'} /><Divider /><DataAction icon="cloud-upload-outline" title="Import backup" detail="Restore a Calis JSON backup after validation." onPress={() => void importData()} loading={busy === 'import'} /><Divider /><DataAction icon="trash-outline" title="Reset data" detail="Permanently remove local Calis data." onPress={() => void resetData()} loading={busy === 'reset'} destructive /></Card><View style={styles.privacy}><Ionicons name="lock-closed" size={15} color={colors.mint} /><AppText variant="caption" color={colors.textMuted} style={styles.privacyText}>No account. No cloud. No camera footage stored. Calis works in airplane mode.</AppText></View><AppText variant="caption" color={colors.textMuted} style={styles.version}>CALIS · OFFLINE COACH · VERSION 1.0</AppText></Screen>;
}

function Preference({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void }): React.JSX.Element { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.preferenceRow}><View style={styles.preferenceIcon}><Ionicons name={icon} size={18} color={colors.lime} /></View><View style={styles.preferenceCopy}><AppText variant="subheading">{title}</AppText><AppText variant="caption" color={colors.textMuted}>{detail}</AppText></View><Ionicons name="chevron-forward" size={17} color={colors.textMuted} /></Pressable>; }
function TogglePreference({ icon, title, detail, value, onValueChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }): React.JSX.Element { return <View style={styles.preferenceRow}><View style={styles.preferenceIcon}><Ionicons name={icon} size={18} color={colors.lime} /></View><View style={styles.preferenceCopy}><AppText variant="subheading">{title}</AppText><AppText variant="caption" color={colors.textMuted}>{detail}</AppText></View><Switch accessibilityLabel={title} accessibilityState={{ checked: value }} value={value} onValueChange={onValueChange} trackColor={{ false: colors.surfaceSoft, true: colors.limeDark }} thumbColor={value ? colors.lime : colors.textMuted} /></View>; }
function DataAction({ icon, title, detail, onPress, loading, destructive = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void; loading: boolean; destructive?: boolean }): React.JSX.Element { return <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={styles.dataRow}><View style={[styles.preferenceIcon, destructive && styles.destructiveIcon]}><Ionicons name={icon} size={18} color={destructive ? colors.coral : colors.lime} /></View><View style={styles.preferenceCopy}><AppText variant="subheading" color={destructive ? colors.coral : colors.text}>{title}</AppText><AppText variant="caption" color={colors.textMuted}>{loading ? 'Working locally…' : detail}</AppText></View><Ionicons name="chevron-forward" size={17} color={colors.textMuted} /></Pressable>; }
function TargetInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }): React.JSX.Element { return <InputField label={label} keyboardType="number-pad" value={String(value)} onChangeText={(text) => { const next = Number(text); if (Number.isFinite(next) && next >= 0) onChange(Math.round(next)); }} />; }

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxl },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong },
  profileAvatar: { width: 60, height: 60, borderRadius: 21, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, gap: 5, alignItems: 'flex-start' },
  preferenceCard: { paddingVertical: 0, paddingHorizontal: spacing.lg, backgroundColor: colors.surfaceRaised },
  preferenceRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  preferenceIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.limeDark, alignItems: 'center', justifyContent: 'center' },
  preferenceCopy: { flex: 1, gap: 3 },
  targetsCard: { gap: spacing.lg, backgroundColor: colors.surfaceRaised },
  targetIntro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetMacros: { flexDirection: 'row', justifyContent: 'space-between' },
  editTargets: { gap: spacing.md },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md },
  saveTarget: { minHeight: 46, paddingHorizontal: spacing.md },
  dataCard: { paddingVertical: 0, paddingHorizontal: spacing.lg, backgroundColor: colors.surfaceRaised },
  dataRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  destructiveIcon: { backgroundColor: colors.coralDark },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
  privacyText: { flex: 1, textAlign: 'center' },
  version: { textAlign: 'center', marginTop: spacing.xl, letterSpacing: 1 },
});
