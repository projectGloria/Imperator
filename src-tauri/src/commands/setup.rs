use serde::Serialize;
use tauri::State;

use crate::config;
use crate::errors::{AppError, AppResult};
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigStatus {
    pub configured: bool,
    /// Never the key — only the (public) tag.
    pub player_tag: Option<String>,
    /// Why it isn't configured, if it isn't.
    pub reason: Option<String>,
    /// Where the .env is expected. Shown on the Setup screen so you know what to edit.
    pub config_path: String,
    /// False in plain dev builds: Setup shows instructions instead of the form.
    pub can_save: bool,
}

#[tauri::command]
pub async fn get_config_status(state: State<'_, AppState>) -> AppResult<ConfigStatus> {
    // Re-read from disk each time so "Retry" after hand-editing .env just works.
    let res = state.reload().await;
    let (configured, player_tag, reason) = match res {
        Ok(c) => (true, Some(c.player_tag), None),
        Err(AppError::NotConfigured { message }) => (false, None, Some(message)),
        Err(e) => (false, None, Some(e.to_string())),
    };
    Ok(ConfigStatus {
        configured,
        player_tag,
        reason,
        config_path: state.paths.env_file().display().to_string(),
        can_save: state.paths.writable,
    })
}

/// Write key + tag to .env. The key travels UI → Rust exactly once and is never echoed back.
#[tauri::command]
pub async fn save_config(state: State<'_, AppState>, api_key: String, player_tag: String) -> AppResult<String> {
    config::save(&state.paths, &api_key, &player_tag)?;
    // `api_key` (the String) drops at end of scope; nothing else retains it outside AppState.
    Ok(state.reload().await?.player_tag)
}
