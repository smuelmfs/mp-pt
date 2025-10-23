export function roundToStep(value: number, step?: number) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}
