import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/theme';

export function Screen({ children, scroll = true, contentStyle, refreshing, onRefresh }: { children: React.ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; refreshing?: boolean; onRefresh?: () => void }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.screenContent, !scroll && styles.screenContentFill, { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom + spacing.xxxl, spacing.xxxl) }, contentStyle]}>{children}</View>;
  if (!scroll) return <View style={styles.screen}>{content}</View>;
  const refreshControl = onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.lime} colors={[colors.lime]} progressBackgroundColor={colors.surfaceRaised} /> : undefined;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={refreshControl}>{content}</ScrollView>;
}

export function AppText({ children, variant = 'body', color = colors.text, style, numberOfLines, accessibilityLabel }: { children: React.ReactNode; variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'number'; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; accessibilityLabel?: string }): React.JSX.Element {
  return <Text accessibilityLabel={accessibilityLabel} numberOfLines={numberOfLines} style={[styles.text, { color }, textStyles[variant], style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }): React.JSX.Element {
  if (onPress) return <View style={[styles.card, style]}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}>{children}</Pressable></View>;
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, icon, loading = false, disabled = false, style, accessibilityLabel }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }): React.JSX.Element {
  const isDisabled = disabled || loading;
  return <View style={[styles.primaryButton, style, disabled && styles.primaryButtonDisabled]}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: isDisabled, busy: loading }} disabled={isDisabled} onPress={onPress} style={({ pressed }) => [styles.primaryPressable, pressed && !isDisabled && styles.pressed]}>{loading ? <><ActivityIndicator color={colors.background} /><AppText variant="label" color={colors.background} style={styles.primaryButtonLabel}>{title}</AppText></> : <>{icon ? <Ionicons name={icon} size={19} color={colors.background} /> : null}<AppText variant="label" color={disabled ? colors.textMuted : colors.background} style={styles.primaryButtonLabel}>{title}</AppText></>}</Pressable></View>;
}

export function SecondaryButton({ title, onPress, icon, disabled = false, style, accessibilityLabel }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }): React.JSX.Element {
  return <View style={[styles.secondaryButton, style, disabled && styles.secondaryButtonDisabled]}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.secondaryPressable, pressed && !disabled && styles.pressed]}>{icon ? <Ionicons name={icon} size={18} color={disabled ? colors.textMuted : colors.lime} /> : null}<AppText variant="label" color={disabled ? colors.textMuted : colors.lime}>{title}</AppText></Pressable></View>;
}

export function TextButton({ title, onPress, icon, color = colors.lime, style }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; color?: string; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return <View style={[styles.textButton, style]}><Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButtonPressable, pressed && styles.pressed]}><AppText variant="label" color={color}>{title}</AppText>{icon ? <Ionicons name={icon} size={16} color={color} /> : null}</Pressable></View>;
}

export function IconButton({ name, onPress, label, size = 22, color = colors.text, style }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; size?: number; color?: string; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return <View style={[styles.iconButton, style]}><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.iconButtonPressable, pressed && styles.pressed]}><Ionicons name={name} size={size} color={color} /></Pressable></View>;
}

export function ProgressBar({ value, color = colors.lime, trackColor = colors.surfaceSoft, height = 7, style }: { value: number; color?: string; trackColor?: string; height?: number; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const safe = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(safe * 100) }} style={[styles.progressTrack, { height, backgroundColor: trackColor }, style]}><View style={[styles.progressFill, { backgroundColor: color, width: `${safe * 100}%` }]} /></View>;
}

export function Tag({ label, color = colors.textSecondary, background = colors.surfaceSoft, icon }: { label: string; color?: string; background?: string; icon?: keyof typeof Ionicons.glyphMap }): React.JSX.Element {
  return <View style={[styles.tag, { backgroundColor: background }]}>{icon ? <Ionicons name={icon} size={12} color={color} /> : null}<AppText variant="caption" color={color}>{label}</AppText></View>;
}

export function SectionHeader({ title, action, onAction, eyebrow }: { title: string; action?: string; onAction?: () => void; eyebrow?: string }): React.JSX.Element {
  return <View style={styles.sectionHeader}><View>{eyebrow ? <AppText variant="caption" color={colors.lime} style={styles.eyebrow}>{eyebrow}</AppText> : null}<AppText variant="heading">{title}</AppText></View>{action && onAction ? <TextButton title={action} onPress={onAction} icon="arrow-forward" /> : null}</View>;
}

export function InputField({ label, error, style, ...props }: Omit<TextInputProps, 'style'> & { label?: string; error?: string; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return <View style={[styles.fieldWrap, style]}>{label ? <AppText variant="label" color={colors.textSecondary}>{label}</AppText> : null}<TextInput accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={error} placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.multiline && styles.inputMultiline, error ? styles.inputError : null]} />{error ? <AppText variant="caption" color={colors.coral}>{error}</AppText> : null}</View>;
}

export function LoadingState({ label = 'Loading your local data…' }: { label?: string }): React.JSX.Element {
  return <View style={styles.centerState}><ActivityIndicator color={colors.lime} size="large" /><AppText color={colors.textSecondary} style={styles.stateText}>{label}</AppText></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): React.JSX.Element {
  return <View style={styles.centerState}><View style={styles.errorIcon}><Ionicons name="alert-circle-outline" size={25} color={colors.coral} /></View><AppText variant="heading">Something went wrong</AppText><AppText color={colors.textSecondary} style={styles.stateText}>{message}</AppText>{onRetry ? <SecondaryButton title="Try again" onPress={onRetry} icon="refresh" /> : null}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return <View style={[styles.divider, style]} />;
}

export function CheckCircle({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }): React.JSX.Element {
  return <View style={[styles.checkCircle, checked && styles.checkCircleChecked]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} style={styles.checkCirclePressable}>{checked ? <Ionicons name="checkmark" size={17} color={colors.background} /> : null}</Pressable></View>;
}

const textStyles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0.2 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.15 },
  number: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  screenContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  screenContentFill: { flex: 1 },
  text: { fontFamily: 'System' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardPressable: { flex: 1 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  primaryButton: { minHeight: 56, borderRadius: radii.md, backgroundColor: colors.lime, borderWidth: 1, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: spacing.xl, shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  primaryPressable: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonDisabled: { backgroundColor: colors.surfaceSoft, borderColor: colors.border, shadowOpacity: 0, elevation: 0 },
  primaryButtonLabel: { letterSpacing: 0.2 },
  secondaryButton: { minHeight: 50, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  secondaryPressable: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButtonDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  textButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  textButtonPressable: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  iconButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  iconButtonPressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { width: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  tag: { minHeight: 27, paddingHorizontal: 10, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxxl, marginBottom: spacing.md },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3, fontWeight: '800' },
  fieldWrap: { gap: 7 },
  input: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.lg, fontSize: 16 },
  inputMultiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.coral },
  centerState: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  errorIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.coralDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  stateText: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 320, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  checkCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkCirclePressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkCircleChecked: { backgroundColor: colors.lime, borderColor: colors.lime },
});
