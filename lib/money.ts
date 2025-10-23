export function toNumber(d: any): number {
  if (d === null || d === undefined) return 0;
  const n = typeof d === "string" ? Number(d) : Number(d);
  return Number.isFinite(n) ? n : 0;
}
