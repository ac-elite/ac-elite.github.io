export type DriverDelta = {
  deltaPace: number;
  deltaSR: number;
};

export function formatSignedKm(delta: number): string {
  if (delta === 0) return '0';
  if (delta > 0) return `+${delta.toLocaleString()}`;
  return delta.toLocaleString();
}
