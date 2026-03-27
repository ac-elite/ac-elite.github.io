import {
  getDriverSR,
  getDriverLicense,
  computeLicenseMap,
  type RankDriver,
} from './ac-elite-data';
import { fetchJson } from './fetch-json';

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
