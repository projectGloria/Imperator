// Mirrors `VillageSnapshot` / `VillageExport` / `Item` in src-tauri/src/commands/village.rs.
// Export keys stay snake_case: they're the game's own field names, passed through as-is.

export interface VillageItem {
  /** Supercell numeric ID; resolve with game-data.json `ids.names`. */
  data: number;
  /** 0 = under construction. */
  lvl: number;
  cnt: number;
  /** Seconds remaining at `export.timestamp`. */
  timer?: number | null;
}

export interface VillageExport {
  tag: string;
  /** Unix SECONDS. */
  timestamp: number;
  buildings: VillageItem[];
  traps: VillageItem[];
  units: VillageItem[];
  siege_machines: VillageItem[];
  heroes: VillageItem[];
  spells: VillageItem[];
  pets: VillageItem[];
  equipment: VillageItem[];
  buildings2: VillageItem[];
  traps2: VillageItem[];
  units2: VillageItem[];
  heroes2: VillageItem[];
}

export interface VillageSnapshot {
  /** ms — when you imported it. */
  importedAt: number;
  export: VillageExport;
}
