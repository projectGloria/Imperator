//! Typed subset of the Supercell API responses we actually render.
//!
//! Deserialising into these (rather than passing raw JSON through) validates the
//! shape at the boundary; unknown fields are ignored so API additions don't break us.
//! Everything not guaranteed by the docs is `Option` / `#[serde(default)]`.
//! Icon URLs are intentionally NOT modelled: they point to Supercell art we don't use.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub tag: String,
    pub name: String,
    pub town_hall_level: u32,
    #[serde(default)]
    pub town_hall_weapon_level: Option<u32>,
    pub exp_level: u32,
    pub trophies: u32,
    pub best_trophies: u32,
    pub war_stars: u32,
    #[serde(default)]
    pub attack_wins: u32,
    #[serde(default)]
    pub defense_wins: u32,
    #[serde(default)]
    pub builder_hall_level: Option<u32>,
    #[serde(default)]
    pub builder_base_trophies: Option<u32>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub war_preference: Option<String>,
    #[serde(default)]
    pub donations: u32,
    #[serde(default)]
    pub donations_received: u32,
    #[serde(default)]
    pub clan_capital_contributions: Option<u64>,
    #[serde(default)]
    pub clan: Option<ClanSummary>,
    #[serde(default)]
    pub league: Option<Named>,
    /// Newer league system (2025+). Kept optional; whichever the API sends is shown.
    #[serde(default)]
    pub league_tier: Option<Named>,
    #[serde(default)]
    pub troops: Vec<Unit>,
    #[serde(default)]
    pub heroes: Vec<Unit>,
    #[serde(default)]
    pub spells: Vec<Unit>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClanSummary {
    pub tag: String,
    pub name: String,
    #[serde(default)]
    pub clan_level: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Named {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Unit {
    pub name: String,
    pub level: u32,
    pub max_level: u32,
    /// "home" | "builderBase" | (future values) — kept as a string, filtered in the UI.
    #[serde(default)]
    pub village: String,
    #[serde(default)]
    pub super_troop_is_active: Option<bool>,
}

/// Envelope so the UI can show "cached · 23s ago" vs "live".
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cached<T> {
    pub data: T,
    pub fetched_at: u64,
    pub from_cache: bool,
}
