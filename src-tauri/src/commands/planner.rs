//! Planner preferences: your category order, saved next to village.json.
//! Only the order lives here — everything else is derived from the snapshot + game data.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::game_data::data_dir;
use crate::errors::{AppError, AppResult};

const FILE: &str = "planner.json";
// The webview is untrusted input: bound what it can make us write to disk.
const MAX_ENTRIES: usize = 32;
const MAX_ID_LEN: usize = 32;

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannerPrefs {
    /// Category ids in priority order. Empty = use game-data.json `planner.defaultOrder`.
    #[serde(default)]
    pub order: Vec<String>,
}

fn file(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join(FILE))
}

fn validate(order: &[String]) -> AppResult<()> {
    let ok = order.len() <= MAX_ENTRIES
        && order
            .iter()
            .all(|id| !id.is_empty() && id.len() <= MAX_ID_LEN && id.chars().all(|c| c.is_ascii_alphanumeric()));
    if ok { Ok(()) } else { Err(AppError::parse("Invalid planner order.")) }
}

/// Missing file → defaults (not an error: you just haven't reordered anything yet).
#[tauri::command]
pub async fn get_planner_prefs(app: AppHandle) -> AppResult<PlannerPrefs> {
    let path = file(&app)?;
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).map_err(|e| AppError::parse(format!("{FILE}: {e}"))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(PlannerPrefs::default()),
        Err(e) => Err(AppError::io(format!("{}: {e}", path.display()))),
    }
}

#[tauri::command]
pub async fn save_planner_prefs(app: AppHandle, order: Vec<String>) -> AppResult<()> {
    validate(&order)?;
    let path = file(&app)?;
    // Same write-then-rename as village.json: never leave a half-written file behind.
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(&PlannerPrefs { order })?)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_validation() {
        assert!(validate(&["heroes".into(), "lab".into()]).is_ok());
        assert!(validate(&[]).is_ok());
        assert!(validate(&["../x".into()]).is_err());
        assert!(validate(&["".into()]).is_err());
        assert!(validate(&vec!["a".to_string(); 33]).is_err());
    }
}
