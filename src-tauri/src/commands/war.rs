use serde_json::json;
use tauri::State;

use super::fetch_cached;
use crate::api::models::{Cached, War};
use crate::config::{encode_tag, normalize_tag};
use crate::errors::{AppError, AppResult};
use crate::state::AppState;

/// State we hand the UI when the war log is private. Not a Supercell value.
const PRIVATE: &str = "warLogPrivate";

/// GET /clans/{clanTag}/currentwar.
///
/// A private war log comes back as a plain 403 `accessDenied` — the same status a bad
/// key gets. We treat it as private here because this page only renders after the
/// player fetch succeeded with the same key; a genuinely bad key would already have
/// blocked the app (invalidIp is a different reason and still propagates as an error).
/// It's a normal clan setting, not a failure, so it becomes data rather than an
/// error screen.
#[tauri::command]
pub async fn get_current_war(
    state: State<'_, AppState>,
    clan_tag: String,
    force_refresh: bool,
) -> AppResult<Cached<War>> {
    let tag = normalize_tag(&clan_tag).ok_or_else(|| AppError::NotFound {
        message: "That isn't a valid clan tag.".into(),
    })?;
    let path = format!("/clans/{}/currentwar", encode_tag(&tag));

    match fetch_cached::<War>(&state, path.clone(), force_refresh, "War").await {
        Err(AppError::AccessDenied { .. }) => {
            // Cache the synthetic answer too, so the 60s rule holds for private logs
            // and tab-hopping doesn't hammer the API with requests we know will 403.
            let raw = json!({ "state": PRIVATE });
            let data = serde_json::from_value(raw.clone())?;
            let entry = state.cache.put(path, raw).await;
            Ok(Cached { data, fetched_at: entry.fetched_at_ms, from_cache: false })
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn war_shapes_deserialise() {
        // Synthetic private state: only `state`.
        let w: War = serde_json::from_value(json!({ "state": PRIVATE })).unwrap();
        assert!(w.clan.is_none());

        // notInWar: Supercell sends zeroed clan stubs without tag/name/members.
        let w: War = serde_json::from_value(json!({
            "state": "notInWar",
            "clan": { "badgeUrls": {}, "clanLevel": 0, "attacks": 0, "stars": 0, "destructionPercentage": 0.0 },
            "opponent": { "badgeUrls": {}, "clanLevel": 0, "stars": 0, "destructionPercentage": 0.0 }
        }))
        .unwrap();
        assert_eq!(w.clan.unwrap().members.len(), 0);

        // inWar with one attack; integer destruction on attacks, float on clans.
        let w: War = serde_json::from_value(json!({
            "state": "inWar", "teamSize": 15, "attacksPerMember": 2,
            "startTime": "20250114T183012.000Z", "endTime": "20250115T183012.000Z",
            "clan": { "tag": "#2PP", "name": "A", "clanLevel": 10, "attacks": 1, "stars": 3,
                      "destructionPercentage": 6.66,
                      "members": [{ "tag": "#P1", "name": "x", "townhallLevel": 9, "mapPosition": 1,
                                    "opponentAttacks": 0,
                                    "attacks": [{ "attackerTag": "#P1", "defenderTag": "#Q1", "stars": 3,
                                                  "destructionPercentage": 100, "order": 1, "duration": 140 }] }] },
            "opponent": { "tag": "#2PQ", "name": "B", "clanLevel": 9, "attacks": 0, "stars": 0,
                          "destructionPercentage": 0, "members": [] }
        }))
        .unwrap();
        assert_eq!(w.clan.unwrap().members[0].attacks[0].stars, 3);
    }
}
