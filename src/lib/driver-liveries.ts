/**
 * Team livery images live at `public/assets/liveries/{steamGuid}.jpg`.
 * `car1.jpg` is the exception (official pack, not a driver skin).
 */

export type TeamLiveryEntry = {
  steamGuid: string;
  /** Title shown on the livery showcase card and in the enlarge dialog. */
  showcaseTitle: string;
  owner: string;
  alt: string;
};

export const TEAM_LIVERY_ENTRIES: readonly TeamLiveryEntry[] = [
  {
    steamGuid: '76561198025621442',
    showcaseTitle: '#10 · DIEnamic',
    owner: 'DIEnamic',
    alt: 'AC Elite team livery, car 10, by DIEnamic',
  },
  {
    steamGuid: '76561198124713255',
    showcaseTitle: '#20 · Duwabbit',
    owner: 'Duwabbit',
    alt: 'AC Elite team livery, car 20, by Duwabbit',
  },
  {
    steamGuid: '76561198212710700',
    showcaseTitle: '#69 · Stella',
    owner: 'Stella',
    alt: 'AC Elite team livery, car 31, by Stella',
  },
] as const;

const TEAM_GUID_SET = new Set(TEAM_LIVERY_ENTRIES.map((e) => e.steamGuid));

export function liveriesAssetUrl(steamGuid: string): string {
  const base = import.meta.env.BASE_URL;
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}/assets/liveries/${steamGuid}.jpg`;
}

export function isTeamLiveryGuid(steamGuid: string): boolean {
  return TEAM_GUID_SET.has(steamGuid);
}

export function getTeamLiveryMeta(steamGuid: string): TeamLiveryEntry | undefined {
  return TEAM_LIVERY_ENTRIES.find((e) => e.steamGuid === steamGuid);
}
