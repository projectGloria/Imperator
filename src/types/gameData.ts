// Shape of data/game-data.json (validated in Rust: commands/game_data.rs).

export type Category = "heroes" | "troops" | "spells" | "siegeMachines";

export interface UnitCaps {
  /** Sparse TH → cap step map; keys are stringified TH levels. */
  caps: Record<string, number>;
  _todo?: string;
}

export interface GameData {
  version: number;
  maxTownHall: number;
  categories: {
    siegeMachines: string[];
    pets: string[];
    superTroops: string[];
  };
  caps: Record<Category, Record<string, UnitCaps>>;
  /** Village-export ID → name map. Rust defaults it, so it's always present. */
  ids: { names: Record<string, string>; unverified: string[] };
}

export interface ConfigStatus {
  configured: boolean;
  playerTag: string | null;
  reason: string | null;
  configPath: string;
  canSave: boolean;
}
