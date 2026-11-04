use tauri::State;

use super::fetch_cached;
use crate::api::models::{Cached, Player};
use crate::config::encode_tag;
use crate::errors::AppResult;
use crate::state::AppState;

/// GET /players/{tag}. `force_refresh` skips the 60s cache (the Refresh button).
#[tauri::command]
pub async fn get_player(state: State<'_, AppState>, force_refresh: bool) -> AppResult<Cached<Player>> {
    let cfg = state.config().await?;
    let path = format!("/players/{}", encode_tag(&cfg.player_tag));
    fetch_cached(&state, path, force_refresh, "Player").await
}
