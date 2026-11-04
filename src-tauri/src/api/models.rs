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

/// GET /clans/{tag}. Badge URLs are deliberately not modelled (Supercell art).
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Clan {
    pub tag: String,
    pub name: String,
    /// "open" | "inviteOnly" | "closed"
    #[serde(rename = "type", default)]
    pub kind: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub location: Option<Named>,
    #[serde(default)]
    pub chat_language: Option<Named>,
    pub clan_level: u32,
    #[serde(default)]
    pub clan_points: u32,
    #[serde(default)]
    pub clan_capital_points: Option<u32>,
    #[serde(default)]
    pub required_trophies: u32,
    #[serde(default)]
    pub required_townhall_level: Option<u32>,
    #[serde(default)]
    pub war_frequency: Option<String>,
    #[serde(default)]
    pub war_win_streak: u32,
    #[serde(default)]
    pub war_wins: u32,
    /// Only present when the war log is public.
    #[serde(default)]
    pub war_ties: Option<u32>,
    #[serde(default)]
    pub war_losses: Option<u32>,
    #[serde(default)]
    pub is_war_log_public: bool,
    #[serde(default)]
    pub war_league: Option<Named>,
    #[serde(default)]
    pub capital_league: Option<Named>,
    /// Member count (0..=50).
    pub members: u32,
    #[serde(default)]
    pub member_list: Vec<ClanMember>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClanMember {
    pub tag: String,
    pub name: String,
    /// "leader" | "coLeader" | "admin" (Elder) | "member"
    pub role: String,
    #[serde(default)]
    pub town_hall_level: Option<u32>,
    pub exp_level: u32,
    #[serde(default)]
    pub league: Option<Named>,
    #[serde(default)]
    pub league_tier: Option<Named>,
    pub trophies: u32,
    #[serde(default)]
    pub builder_base_trophies: Option<u32>,
    pub clan_rank: u32,
    #[serde(default)]
    pub previous_clan_rank: u32,
    pub donations: u32,
    pub donations_received: u32,
}

/// GET /clans/{tag}/currentwar. `clan` is always the clan we asked about.
///
/// Almost everything is optional: a `notInWar` response carries only `state` plus
/// zeroed stubs, and we synthesise `{"state":"warLogPrivate"}` for the 403 case
/// (see commands/war.rs), so the struct must deserialise from just `state`.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct War {
    /// "notInWar" | "preparation" | "inWar" | "warEnded" | "warLogPrivate" (ours).
    pub state: String,
    #[serde(default)]
    pub team_size: u32,
    /// Missing on some older responses; the UI defaults it to 2.
    #[serde(default)]
    pub attacks_per_member: Option<u32>,
    /// Timestamps stay in Supercell's compact form ("20250114T183012.000Z");
    /// parsed once in the UI rather than pulling in chrono for three fields.
    #[serde(default)]
    pub preparation_start_time: Option<String>,
    #[serde(default)]
    pub start_time: Option<String>,
    #[serde(default)]
    pub end_time: Option<String>,
    #[serde(default)]
    pub clan: Option<WarClan>,
    #[serde(default)]
    pub opponent: Option<WarClan>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WarClan {
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub clan_level: u32,
    #[serde(default)]
    pub attacks: u32,
    #[serde(default)]
    pub stars: u32,
    #[serde(default)]
    pub destruction_percentage: f64,
    #[serde(default)]
    pub members: Vec<WarMember>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WarMember {
    pub tag: String,
    pub name: String,
    /// Note the API's lowercase "h" here (`townhallLevel`), unlike `/players`.
    #[serde(default)]
    pub townhall_level: u32,
    #[serde(default)]
    pub map_position: u32,
    /// Absent until the member has attacked.
    #[serde(default)]
    pub attacks: Vec<WarAttack>,
    #[serde(default)]
    pub opponent_attacks: u32,
    #[serde(default)]
    pub best_opponent_attack: Option<WarAttack>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WarAttack {
    pub attacker_tag: String,
    pub defender_tag: String,
    pub stars: u32,
    #[serde(default)]
    pub destruction_percentage: f64,
    #[serde(default)]
    pub order: u32,
    #[serde(default)]
    pub duration: Option<u32>,
}
