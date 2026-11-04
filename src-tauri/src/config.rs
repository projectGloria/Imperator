//! Config resolution and the redacted API key type.
//!
//! Where `.env` lives:
//!   1. `IMPERATOR_CONFIG_DIR` (debug builds only) — lets you exercise the Setup
//!      screen in `tauri dev` against a throwaway folder.
//!   2. debug build  → project root (next to package.json).
//!   3. release build → `%APPDATA%\com.imperator.app\` (Tauri app_config_dir).
//!
//! The file is read at *runtime*. Only the directory path is compiled in (via
//! CARGO_MANIFEST_DIR in debug builds), never the file contents.

use std::fmt;
use std::path::PathBuf;

use tauri::AppHandle;
// Manager provides app.path(), only needed for the release-build paths.
#[cfg(not(debug_assertions))]
use tauri::Manager;

use crate::errors::{AppError, AppResult};

pub const ENV_FILE: &str = ".env";
const KEY_VAR: &str = "COC_API_KEY";
const TAG_VAR: &str = "COC_PLAYER_TAG";
#[cfg(debug_assertions)]
const OVERRIDE_VAR: &str = "IMPERATOR_CONFIG_DIR";

/// API key wrapper. No `Display`, and `Debug` is redacted, so `{:?}` on any
/// struct containing it (tracing, panics, dbg!) can't spill the secret.
#[derive(Clone)]
pub struct ApiKey(String);

impl ApiKey {
    /// The only way to read the raw value — grep for `expose` to audit every use.
    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for ApiKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("ApiKey(<redacted>)")
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub api_key: ApiKey,
    /// Normalised, with leading `#`.
    pub player_tag: String,
}

#[derive(Debug, Clone)]
pub struct Paths {
    pub config_dir: PathBuf,
    /// Whether `save_config` may write into `config_dir`.
    pub writable: bool,
}

impl Paths {
    pub fn env_file(&self) -> PathBuf {
        self.config_dir.join(ENV_FILE)
    }
}

/// Project root in debug builds (src-tauri/..).
#[cfg(debug_assertions)]
pub fn project_root() -> PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().map(std::path::Path::to_path_buf).unwrap_or_default()
}

pub fn resolve_paths(app: &AppHandle) -> AppResult<Paths> {
    #[cfg(debug_assertions)]
    {
        let _ = app; // unused in debug
        if let Some(dir) = std::env::var_os(OVERRIDE_VAR).filter(|v| !v.is_empty()) {
            return Ok(Paths { config_dir: PathBuf::from(dir), writable: true });
        }
        // Dev: the root .env is yours to edit by hand; refuse to overwrite it from the UI.
        Ok(Paths { config_dir: project_root(), writable: false })
    }
    #[cfg(not(debug_assertions))]
    {
        let dir = app
            .path()
            .app_config_dir()
            .map_err(|_| AppError::io("Could not resolve the app config directory."))?;
        Ok(Paths { config_dir: dir, writable: true })
    }
}

/// Load `.env` from `paths`. Missing file / missing vars → NotConfigured.
pub fn load(paths: &Paths) -> AppResult<Config> {
    let file = paths.env_file();
    if !file.exists() {
        return Err(AppError::not_configured(format!("No .env found in {}", paths.config_dir.display())));
    }

    // `from_path_iter` parses without touching the process environment, so the key
    // never ends up in `std::env` where child processes / crash reporters could see it.
    let iter = dotenvy::from_path_iter(&file)
        .map_err(|_| AppError::not_configured("Could not open .env."))?;

    let mut key = None;
    let mut tag = None;
    for item in iter {
        // Deliberately NOT forwarding the dotenvy error: `LineParse` embeds the raw
        // offending line, which could be the key itself.
        let (k, v) = item.map_err(|_| AppError::not_configured(".env contains a malformed line."))?;
        match k.as_str() {
            KEY_VAR => key = Some(v),
            TAG_VAR => tag = Some(v),
            _ => {}
        }
    }

    let key = key
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty())
        .ok_or_else(|| AppError::not_configured(format!("{KEY_VAR} is missing or empty.")))?;
    let tag = tag.ok_or_else(|| AppError::not_configured(format!("{TAG_VAR} is missing.")))?;
    // dotenv syntax: an unquoted `#` starts a comment, so `TAG=#ABC` parses as "".
    // It's the most likely mistake, so name the fix instead of just saying "invalid".
    if tag.trim().is_empty() {
        return Err(AppError::not_configured(format!(
            r##"{TAG_VAR} is empty. In .env a bare # starts a comment: write {TAG_VAR}="#YOURTAG" (quoted) or leave out the #."##
        )));
    }
    let player_tag = normalize_tag(&tag).ok_or_else(|| {
        AppError::not_configured(format!("{TAG_VAR} is not a valid tag (expected something like #2PP)."))
    })?;

    Ok(Config { api_key: ApiKey(key), player_tag })
}

/// Validate + write a new `.env`. Caller reloads state afterwards.
pub fn save(paths: &Paths, api_key: &str, player_tag: &str) -> AppResult<String> {
    if !paths.writable {
        return Err(AppError::not_configured(
            "In dev builds, edit the .env in the project root (or set IMPERATOR_CONFIG_DIR to test Setup).",
        ));
    }
    let key = api_key.trim();
    // Keys are JWTs: printable ASCII, no whitespace. Rejecting newlines also blocks
    // injecting extra lines into the .env.
    if key.is_empty() || !key.chars().all(|c| c.is_ascii_graphic()) {
        return Err(AppError::not_configured("API key looks invalid (empty or contains spaces/newlines)."));
    }
    let tag = normalize_tag(player_tag)
        .ok_or_else(|| AppError::not_configured("Player tag is not valid (expected something like #2PP)."))?;

    std::fs::create_dir_all(&paths.config_dir)?;
    // Tag quoted: an unquoted `#` would be read back as a comment (see `load`).
    let body = format!("{KEY_VAR}={key}\n{TAG_VAR}=\"{tag}\"\n");
    std::fs::write(paths.env_file(), body)?;
    Ok(tag)
}

/// Uppercase, ensure `#`, map the common `O`→`0` typo, and check the charset
/// Supercell uses for tags (0289PYLQGRJCUV).
pub fn normalize_tag(raw: &str) -> Option<String> {
    let body: String = raw
        .trim()
        .trim_start_matches('#')
        .chars()
        .map(|c| c.to_ascii_uppercase())
        .map(|c| if c == 'O' { '0' } else { c })
        .collect();
    let valid = (3..=12).contains(&body.len()) && body.chars().all(|c| "0289PYLQGRJCUV".contains(c));
    valid.then(|| format!("#{body}"))
}

/// `#ABC` → `%23ABC`. Tags are already restricted to [0-9A-Z] so `#` is the only
/// character that needs escaping — no need for a full percent-encoding crate.
pub fn encode_tag(tag: &str) -> String {
    format!("%23{}", tag.trim_start_matches('#'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tag_normalisation() {
        assert_eq!(normalize_tag(" #2pp ").as_deref(), Some("#2PP"));
        assert_eq!(normalize_tag("2PPO").as_deref(), Some("#2PP0"));
        assert_eq!(normalize_tag("#ABC"), None);
        assert_eq!(encode_tag("#2PP"), "%232PP");
    }

    fn load_str(name: &str, body: &str) -> AppResult<Config> {
        let dir = std::env::temp_dir().join(format!("imperator-test-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join(ENV_FILE), body).unwrap();
        let res = load(&Paths { config_dir: dir.clone(), writable: false });
        let _ = std::fs::remove_dir_all(dir);
        res
    }

    #[test]
    fn load_tag_variants() {
        // Quoted and #-less forms both load.
        let q = load_str("q", "# c\nCOC_API_KEY=abc.def\nCOC_PLAYER_TAG=\"#R2CVUYYRC\"\n").unwrap();
        assert_eq!(q.player_tag, "#R2CVUYYRC");
        let bare = load_str("b", "COC_API_KEY=abc.def\nCOC_PLAYER_TAG=R2CVUYYRC\n").unwrap();
        assert_eq!(bare.player_tag, "#R2CVUYYRC");
        // Unquoted # → dotenv comment → empty → explicit, actionable error.
        match load_str("u", "COC_API_KEY=abc.def\nCOC_PLAYER_TAG=#R2CVUYYRC\n") {
            Err(AppError::NotConfigured { message }) => assert!(message.contains("quoted")),
            other => panic!("expected NotConfigured, got {other:?}"),
        }
    }

    #[test]
    fn save_roundtrips_through_load() {
        let dir = std::env::temp_dir().join(format!("imperator-test-{}-save", std::process::id()));
        let paths = Paths { config_dir: dir.clone(), writable: true };
        save(&paths, "abc.def", "#r2cvuyyrc").unwrap();
        assert_eq!(load(&paths).unwrap().player_tag, "#R2CVUYYRC");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn key_debug_is_redacted() {
        let k = ApiKey("secret".into());
        assert!(!format!("{k:?}").contains("secret"));
    }
}
