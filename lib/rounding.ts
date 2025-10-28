export function roundMoney2(value: number) {
  return Math.round(value * 100) / 100;
}

// arredonda para degrau (ex.: 0.05)
export function roundToStep(value: number, step?: number) {
  if (!step || step <= 0) return roundMoney2(value);
  const scaled = Math.round(value / step) * step;
  return roundMoney2(scaled);
}

// ceil físico (folhas, tiros, horas, degraus m²)
export const ceilInt = (v: number) => Math.ceil(v);
