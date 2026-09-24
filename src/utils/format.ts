export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatClockTime(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatLongDate(date = new Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase();
}

export function formatDayNumber(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date);
}

export function formatWeight(weightKg: number, units: 'metric' | 'imperial' = 'metric'): string {
  return units === 'imperial' ? `${(weightKg * 2.2046226218).toFixed(1)} lb` : `${weightKg.toFixed(1)} kg`;
}

export function formatHeight(heightCm: number, units: 'metric' | 'imperial' = 'metric'): string {
  return units === 'imperial' ? `${(heightCm / 2.54).toFixed(0)} in` : `${Math.round(heightCm)} cm`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
