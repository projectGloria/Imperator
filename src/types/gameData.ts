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
}

export interface ConfigStatus {
  configured: boolean;
  playerTag: string | null;
  reason: string | null;
  configPath: string;
  canSave: boolean;
}
