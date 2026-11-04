//! Editable game data (per-TH caps). Lives in `data/game-data.json`, not in code.

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
// Manager provides app.path(), only needed for the release-build paths.
#[cfg(not(debug_assertions))]
use tauri::Manager;

use crate::errors::{AppError, AppResult};

const FILE: &str = "game-data.json";

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameData {
    pub version: u32,
    /// Highest TH the caps were written for; above this the UI warns caps may be stale.
    pub max_town_hall: u32,
    pub categories: Categories,
    pub caps: Caps,
    /// Numeric export IDs → names, for the village import. Optional so an older
    /// game-data.json without it still loads (imports then show "Unknown #id").
    #[serde(default)]
    pub ids: Ids,
    /// Building/trap caps for the planner, keyed by export ID. Optional like `ids`.
    #[serde(default)]
    pub buildings: HashMap<String, BuildingCaps>,
    #[serde(default)]
    pub planner: PlannerData,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingCaps {
    /// Planner category id (must match one in `planner.categories`).
    pub category: String,
    /// TH → max level, sparse step map (same convention as unit caps).
    pub caps: BTreeMap<String, u32>,
    /// TH → how many can be built. Absent = we don't know, so no "not built" rows.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub counts: Option<BTreeMap<String, u32>>,
    #[serde(default, rename = "_todo", skip_serializing_if = "Option::is_none")]
    pub todo: Option<String>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannerData {
    #[serde(default)]
    pub categories: Vec<PlannerCategory>,
    #[serde(default)]
    pub default_order: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PlannerCategory {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ids {
    /// Keyed by the stringified ID (JSON object keys must be strings).
    #[serde(default)]
    pub names: HashMap<String, String>,
    /// IDs whose name is a guess; the UI marks them so you know what to check.
    #[serde(default)]
    pub unverified: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Categories {
    /// API lists these inside `troops`; we need the names to split them out.
    pub siege_machines: Vec<String>,
    pub pets: Vec<String>,
    pub super_troops: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Caps {
    pub heroes: HashMap<String, UnitCaps>,
    pub troops: HashMap<String, UnitCaps>,
    pub spells: HashMap<String, UnitCaps>,
    pub siege_machines: HashMap<String, UnitCaps>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnitCaps {
    /// Sparse step map: TH (as string key, JSON limitation) → max level from that TH on.
    pub caps: BTreeMap<String, u32>,
    /// Free-text TODO; forwarded so the UI can surface "unverified" if you want it later.
    #[serde(default, rename = "_todo", skip_serializing_if = "Option::is_none")]
    pub todo: Option<String>,
}

/// Folder for editable local data (game-data.json, village.json).
/// Debug: `<project root>/data`. Release: `%APPDATA%\com.imperator.app\data`
/// (app_data_dir), created on demand.
pub(crate) fn data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        Ok(crate::config::project_root().join("data"))
    }
    #[cfg(not(debug_assertions))]
    {
        let dir = app.path().app_data_dir().map_err(|_| AppError::io("No app data dir."))?.join("data");
        std::fs::create_dir_all(&dir)?;
        Ok(dir)
    }
}

fn data_file(app: &AppHandle) -> AppResult<PathBuf> {
    let target = data_dir(app)?.join(FILE);
    // Packaged: seed the editable copy from the bundled resource once.
    #[cfg(not(debug_assertions))]
    if !target.exists() {
        let bundled = app
            .path()
            .resource_dir()
            .map_err(|_| AppError::io("No resource dir."))?
            .join("data")
            .join(FILE);
        std::fs::copy(bundled, &target)?;
    }
    Ok(target)
}

#[tauri::command]
pub async fn get_game_data(app: AppHandle) -> AppResult<GameData> {
    let path = data_file(&app)?;
    let text = std::fs::read_to_string(&path)
        .map_err(|e| AppError::io(format!("{}: {e}", path.display())))?;
    serde_json::from_str(&text).map_err(|e| AppError::parse(format!("{FILE}: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The shipped file must parse with the typed schema: a stray `_note` string inside a
    /// typed map, or a misspelt key, would otherwise only surface as a runtime banner.
    #[test]
    fn shipped_game_data_parses() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../data").join(FILE);
        let gd: GameData = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let cats: Vec<&str> = gd.planner.categories.iter().map(|c| c.id.as_str()).collect();
        for b in gd.buildings.values() {
            assert!(cats.contains(&b.category.as_str()), "unknown category {}", b.category);
        }
        for id in gd.buildings.keys() {
            assert!(gd.ids.names.contains_key(id), "building {id} has caps but no name");
        }
    }
}
