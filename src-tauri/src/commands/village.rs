//! Village import: the JSON the game exports (Settings → copy village data).
//!
//! The export is the only source of upgrade timers — the API has none. It's a point-in-time
//! snapshot: `timer` values are seconds remaining *at `timestamp`*, so the UI computes
//! `endsAt = (timestamp + timer) * 1000` and counts down from there.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::game_data::data_dir;
use crate::cache::now_ms;
use crate::config::normalize_tag;
use crate::errors::{AppError, AppResult};

const FILE: &str = "village.json";
/// A real export is ~10 KB. The cap only stops an accidental multi-MB paste from
/// being parsed and written to disk.
const MAX_BYTES: usize = 2 * 1024 * 1024;

/// Typed subset of the export. Field names match the game's snake_case keys as-is
/// (no rename_all), so the TS mirror reads exactly like the file you pasted.
/// Decorations, obstacles, skins, sceneries, house parts and helpers are not modelled;
/// they're still kept in the saved file because we store the raw export.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VillageExport {
    pub tag: String,
    /// Unix seconds when the export was taken.
    pub timestamp: u64,
    #[serde(default)]
    pub buildings: Vec<Item>,
    #[serde(default)]
    pub traps: Vec<Item>,
    #[serde(default)]
    pub units: Vec<Item>,
    #[serde(default)]
    pub siege_machines: Vec<Item>,
    #[serde(default)]
    pub heroes: Vec<Item>,
    #[serde(default)]
    pub spells: Vec<Item>,
    #[serde(default)]
    pub pets: Vec<Item>,
    #[serde(default)]
    pub equipment: Vec<Item>,
    /// Builder Base ("2" suffix in the export).
    #[serde(default)]
    pub buildings2: Vec<Item>,
    #[serde(default)]
    pub traps2: Vec<Item>,
    #[serde(default)]
    pub units2: Vec<Item>,
    #[serde(default)]
    pub heroes2: Vec<Item>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Item {
    /// Supercell's numeric global ID (e.g. 1000001 = Town Hall). Names come from game-data.json.
    pub data: u64,
    /// Current level. 0 = still being built.
    #[serde(default)]
    pub lvl: u32,
    /// Absent on entries that are upgrading: each upgrading instance is listed on its own.
    #[serde(default = "one")]
    pub cnt: u32,
    /// Seconds left on the running upgrade, relative to the export `timestamp`.
    #[serde(default)]
    pub timer: Option<u64>,
}

fn one() -> u32 {
    1
}

/// What's on disk and what the UI gets.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VillageSnapshot {
    /// When *you* imported it (ms) — distinct from the export's own timestamp.
    pub imported_at: u64,
    pub export: VillageExport,
}

/// On disk we keep the export verbatim (as a JSON value), so fields we don't model yet
/// (equipment details, helpers, …) are still there when a later step needs them.
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stored {
    imported_at: u64,
    export: serde_json::Value,
}

fn file(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(data_dir(app)?.join(FILE))
}

/// Parse + validate pasted text. Separate from the command so it's unit-testable.
fn parse_export(json: &str) -> AppResult<(serde_json::Value, VillageExport)> {
    if json.len() > MAX_BYTES {
        return Err(AppError::parse("That's far bigger than a village export (over 2 MB)."));
    }
    let raw: serde_json::Value = serde_json::from_str(json.trim())
        .map_err(|e| AppError::parse(format!("Not valid JSON: {e}")))?;
    let export: VillageExport = serde_json::from_value(raw.clone())
        .map_err(|e| AppError::parse(format!("Doesn't look like a village export: {e}")))?;
    if normalize_tag(&export.tag).is_none() {
        return Err(AppError::parse("The export's player tag isn't a valid tag."));
    }
    if export.buildings.is_empty() {
        return Err(AppError::parse("The export has no buildings — is it the full village export?"));
    }
    Ok((raw, export))
}

#[tauri::command]
pub async fn import_village(app: AppHandle, json: String) -> AppResult<VillageSnapshot> {
    let (raw, export) = parse_export(&json)?;
    let stored = Stored { imported_at: now_ms(), export: raw };
    let path = file(&app)?;

    // Write-then-rename: a crash mid-write leaves the previous snapshot intact instead
    // of a truncated village.json that would fail to load next start.
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(&stored)?)?;
    std::fs::rename(&tmp, &path)?;

    Ok(VillageSnapshot { imported_at: stored.imported_at, export })
}

/// `None` = nothing imported yet (not an error — the page shows the import form).
#[tauri::command]
pub async fn get_village(app: AppHandle) -> AppResult<Option<VillageSnapshot>> {
    let path = file(&app)?;
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(AppError::io(format!("{}: {e}", path.display()))),
    };
    let stored: Stored = serde_json::from_str(&text).map_err(|e| AppError::parse(format!("{FILE}: {e}")))?;
    let export = serde_json::from_value(stored.export).map_err(|e| AppError::parse(format!("{FILE}: {e}")))?;
    Ok(Some(VillageSnapshot { imported_at: stored.imported_at, export }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Trimmed from a real export: upgrading entries have `timer` and no `cnt`,
    // a building under construction is lvl 0, unknown top-level keys are ignored.
    const SAMPLE: &str = r##"{"tag":"#R2CVUYYRC","timestamp":1793760221,
        "helpers":[{"data":93000001,"lvl":1,"helper_cooldown":72158}],
        "buildings":[{"data":1000006,"lvl":9,"timer":38905},{"data":1000000,"lvl":5,"cnt":4}],
        "units":[{"data":4000000,"lvl":4,"timer":3705}],
        "house_parts":[82000000],"buildings2":[{"data":1000053,"lvl":0,"timer":25672}],
        "boosts":{"clocktower_cooldown":29996}}"##;

    #[test]
    fn parses_real_shape() {
        let (_, e) = parse_export(SAMPLE).unwrap();
        assert_eq!(e.timestamp, 1_793_760_221);
        assert_eq!(e.buildings[0].cnt, 1); // defaulted
        assert_eq!(e.buildings[0].timer, Some(38_905));
        assert_eq!(e.buildings[1].cnt, 4);
        assert_eq!(e.buildings2[0].lvl, 0);
        assert_eq!(e.units[0].timer, Some(3705));
    }

    #[test]
    fn rejects_junk() {
        assert!(parse_export("not json").is_err());
        assert!(parse_export(r##"{"tag":"#R2CVUYYRC","timestamp":1}"##).is_err()); // no buildings
        assert!(parse_export(r#"{"tag":"nope!","timestamp":1,"buildings":[{"data":1}]}"#).is_err());
    }
}
