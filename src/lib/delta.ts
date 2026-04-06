import { fetchJson } from './fetch-json';
import {
  getDriverSR,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
} from './ac-elite-data';

export type DriverDelta = {
  deltaPace: number;
  deltaSR: number;
};

const EPSILON = 0.001;

export async function fetchPrevRankData(): Promise<RankDriver[]> {
  try {
    return await fetchJson<RankDriver[]>('/data/rank-24h.json');
  } catch {
    return [];
  }
}

/** Aggregate change vs `rank-24h.json` baseline (community-wide). */
export type CommunitySnapshotDelta = {
  hasBaseline: boolean;
  /** Rounded total km across all drivers, current minus snapshot. */
  deltaKm: number;
  /** Drivers present in current rank but not in the snapshot. */
  newDrivers: number;
};

export function computeCommunitySnapshotDelta(
  currentDrivers: RankDriver[],
  prevDrivers: RankDriver[]
): CommunitySnapshotDelta {
  if (!prevDrivers.length) {
    return { hasBaseline: false, deltaKm: 0, newDrivers: 0 };
  }
  const sumKm = (drivers: RankDriver[]) =>
    drivers.reduce((sum, d) => sum + (d.kilometers || 0), 0);
  const deltaKm = Math.round(sumKm(currentDrivers) - sumKm(prevDrivers));
  const prevGuids = new Set(prevDrivers.map((d) => d.guid));
  const newDrivers = currentDrivers.filter((d) => !prevGuids.has(d.guid)).length;
  return { hasBaseline: true, deltaKm, newDrivers };
}

export function formatSignedKm(delta: number): string {
  if (delta === 0) return '0';
  if (delta > 0) return `+${delta.toLocaleString()}`;
  return delta.toLocaleString();
}

export function computeDeltas(
  currentDrivers: RankDriver[],
  prevDrivers: RankDriver[]
): Map<string, DriverDelta> {
  const deltas = new Map<string, DriverDelta>();
  if (!prevDrivers.length) return deltas;

  const currentLicenseMap = computeLicenseMap(currentDrivers);
  const prevLicenseMap = computeLicenseMap(prevDrivers);

  const prevByGuid = new Map(prevDrivers.map((d) => [d.guid, d]));

  for (const driver of currentDrivers) {
    const prev = prevByGuid.get(driver.guid);
    if (!prev) continue;

    const curLicense = getDriverLicense(driver, currentLicenseMap);
    const prevLicense = getDriverLicense(prev, prevLicenseMap);

    const curSR = getDriverSR(driver).sr;
    const prevSR = getDriverSR(prev).sr;

    const deltaPace = curLicense.paceScore - prevLicense.paceScore;
    const deltaSR = curSR - prevSR;

    if (Math.abs(deltaPace) > EPSILON || Math.abs(deltaSR) > EPSILON) {
      deltas.set(driver.guid, { deltaPace, deltaSR });
    }
  }

  return deltas;
}
