/**
 * ACE Skin Pack author / team pairing for display order and per-card author labels.
 * IDs match `scripts/generate-ace-skin-pack-manifest.mjs`: `ACE#` + digits from `aceNN.jpg`.
 */

export type AceSkinPackManifestEntry = {
  id: string;
  title: string;
  previewUrl: string;
};

export type AceSkinPackAuthorTeam = {
  guid: string;
  displayName: string;
  pairs: readonly [number, number][];
};

/** Order follows author blocks, then pairs in the order listed. */
export const ACE_SKIN_PACK_AUTHOR_TEAMS: readonly AceSkinPackAuthorTeam[] = [
  {
    guid: '76561199067031859',
    displayName: 'Saba',
    pairs: [
      [11, 65],
      [12, 76],
      [26, 31],
      [81, 96],
    ],
  },
  {
    guid: '76561199664649696',
    displayName: 'olalekezion810',
    pairs: [
      [7, 8],
      [3, 6],
      [10, 43],
      [16, 44],
    ],
  },
  {
    guid: '76561198328304798',
    displayName: 'CarterReza',
    pairs: [
      [4, 36],
      [9, 60],
      [22, 70],
      [56, 98],
    ],
  },
] as const;

export function aceManifestIdFromCarNumber(n: number): string {
  return `ACE#${String(n).padStart(2, '0')}`;
}

export type AceSkinPackPairRow = {
  author: { guid: string; displayName: string };
  left: AceSkinPackManifestEntry;
  right: AceSkinPackManifestEntry;
};

export function buildAceSkinPackPairRows(
  entries: readonly AceSkinPackManifestEntry[]
): AceSkinPackPairRow[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const rows: AceSkinPackPairRow[] = [];

  for (const author of ACE_SKIN_PACK_AUTHOR_TEAMS) {
    for (const [a, b] of author.pairs) {
      const idA = aceManifestIdFromCarNumber(a);
      const idB = aceManifestIdFromCarNumber(b);
      const left = byId.get(idA);
      const right = byId.get(idB);
      if (left && right) {
        rows.push({
          author: { guid: author.guid, displayName: author.displayName },
          left,
          right,
        });
      }
    }
  }

  return rows;
}

export function getUnpairedAceSkinPackEntries(
  entries: readonly AceSkinPackManifestEntry[],
  rows: readonly AceSkinPackPairRow[]
): AceSkinPackManifestEntry[] {
  const paired = new Set<string>();
  for (const row of rows) {
    paired.add(row.left.id);
    paired.add(row.right.id);
  }
  return entries.filter((e) => !paired.has(e.id));
}

export type AceSkinPackAuthorRef = {
  guid: string;
  displayName: string;
};

/** Resolve author for a manifest id (e.g. ACE#11) from configured team pairs. */
export function getAceSkinPackAuthorForEntryId(id: string): AceSkinPackAuthorRef | null {
  const m = id.match(/^ACE#(\d+)$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  for (const author of ACE_SKIN_PACK_AUTHOR_TEAMS) {
    for (const [a, b] of author.pairs) {
      if (a === n || b === n) {
        return { guid: author.guid, displayName: author.displayName };
      }
    }
  }
  return null;
}

/**
 * Flat grid order: author blocks → pairs (left then right car) → any unpaired entries last.
 */
export function flattenAceSkinPackOrderedEntries(
  entries: readonly AceSkinPackManifestEntry[]
): AceSkinPackManifestEntry[] {
  const pairRows = buildAceSkinPackPairRows(entries);
  const unpaired = getUnpairedAceSkinPackEntries(entries, pairRows);
  const ordered: AceSkinPackManifestEntry[] = [];
  for (const row of pairRows) {
    ordered.push(row.left, row.right);
  }
  ordered.push(...unpaired);
  return ordered;
}
