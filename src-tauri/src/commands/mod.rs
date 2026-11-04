pub mod clan;
pub mod game_data;
pub mod net;
pub mod player;
pub mod setup;
pub mod war;

use serde::de::DeserializeOwned;

use crate::api::{client, models::Cached};
use crate::errors::{AppError, AppResult};
use crate::state::AppState;

/// Shared "cache → API → validate → cache" path for every GET endpoint.
///
/// `path` must already be URL-encoded; it doubles as the cache key. `what` names the
/// resource in parse errors ("Clan response: missing field ...").
pub(crate) async fn fetch_cached<T: DeserializeOwned>(
    state: &AppState,
    path: String,
    force_refresh: bool,
    what: &str,
) -> AppResult<Cached<T>> {
    let parse = |v: serde_json::Value| {
        serde_json::from_value::<T>(v).map_err(|e| AppError::parse(format!("{what} response: {e}")))
    };

    if !force_refresh {
        if let Some(hit) = state.cache.get_fresh(&path).await {
            return Ok(Cached { data: parse(hit.value)?, fetched_at: hit.fetched_at_ms, from_cache: true });
        }
    }

    // Owned clone out of the RwLock, so no guard is held across the HTTP await.
    let cfg = state.config().await?;
    let raw = client::get_json(&state.http, &cfg.api_key, &path).await?;
    // Validate BEFORE caching so a malformed payload can't poison the cache for 60s.
    let data = parse(raw.clone())?;
    let entry = state.cache.put(path, raw).await;
    Ok(Cached { data, fetched_at: entry.fetched_at_ms, from_cache: false })
}
