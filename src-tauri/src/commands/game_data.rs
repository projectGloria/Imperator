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

fn data_file(app: &AppHandle) -> AppResult<PathBuf> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        Ok(crate::config::project_root().join("data").join(FILE))
    }
    #[cfg(not(debug_assertions))]
    {
        // Packaged: keep an editable copy in app data, seeded from the bundled resource once.
        let dir = app.path().app_data_dir().map_err(|_| AppError::io("No app data dir."))?.join("data");
        let target = dir.join(FILE);
        if !target.exists() {
            let bundled = app
                .path()
                .resource_dir()
                .map_err(|_| AppError::io("No resource dir."))?
                .join("data")
                .join(FILE);
            std::fs::create_dir_all(&dir)?;
            std::fs::copy(bundled, &target)?;
        }
        Ok(target)
    }
}

#[tauri::command]
pub async fn get_game_data(app: AppHandle) -> AppResult<GameData> {
    let path = data_file(&app)?;
    let text = std::fs::read_to_string(&path)
        .map_err(|e| AppError::io(format!("{}: {e}", path.display())))?;
    serde_json::from_str(&text).map_err(|e| AppError::parse(format!("{FILE}: {e}")))
}
