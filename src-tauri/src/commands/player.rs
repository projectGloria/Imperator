use tauri::State;

use crate::api::{client, models::{Cached, Player}};
use crate::config::encode_tag;
use crate::errors::{AppError, AppResult};
use crate::state::AppState;

/// GET /players/{tag}. `force_refresh` skips the 60s cache (the Refresh button).
#[tauri::command]
pub async fn get_player(state: State<'_, AppState>, force_refresh: bool) -> AppResult<Cached<Player>> {
    // Clone out of the RwLock immediately so the guard isn't held across the HTTP await.
    let cfg = state.config().await?;
    let path = format!("/players/{}", encode_tag(&cfg.player_tag));

    if !force_refresh {
        if let Some(hit) = state.cache.get_fresh(&path).await {
            let data: Player = serde_json::from_value(hit.value)?;
            return Ok(Cached { data, fetched_at: hit.fetched_at_ms, from_cache: true });
        }
    }

    let raw = client::get_json(&state.http, &cfg.api_key, &path).await?;
    // Validate before caching so a malformed payload can't poison the cache.
    let data: Player = serde_json::from_value(raw.clone())
        .map_err(|e| AppError::parse(format!("Player response: {e}")))?;
    let entry = state.cache.put(path, raw).await;
    Ok(Cached { data, fetched_at: entry.fetched_at_ms, from_cache: false })
}
