use tauri::State;

use super::fetch_cached;
use crate::api::models::{Cached, Clan};
use crate::config::{encode_tag, normalize_tag};
use crate::errors::{AppError, AppResult};
use crate::state::AppState;

/// GET /clans/{clanTag}. The tag comes from the UI (your player's `clan.tag`), so it's
/// re-validated here: the webview is not trusted to build URL paths.
#[tauri::command]
pub async fn get_clan(state: State<'_, AppState>, clan_tag: String, force_refresh: bool) -> AppResult<Cached<Clan>> {
    let tag = normalize_tag(&clan_tag).ok_or_else(|| AppError::NotFound {
        message: "That isn't a valid clan tag.".into(),
    })?;
    let path = format!("/clans/{}", encode_tag(&tag));
    fetch_cached(&state, path, force_refresh, "Clan").await
}
