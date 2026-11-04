//! Typed error enum shared by every command.
//!
//! Serialised as `{ "kind": "...", "message": "...", ...extra }` so the UI can
//! `switch (err.kind)` with exhaustive TS types instead of string-sniffing.
//! Messages are written by us — never `format!("{reqwest_err}")` verbatim into
//! the UI, so nothing from request internals (headers, URLs with tokens) leaks.

use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AppError {
    /// No usable .env (missing file, missing key, or malformed tag).
    #[error("App is not configured: {message}")]
    NotConfigured { message: String },

    /// 403 with reason `accessDenied.invalidIp` — the key's IP whitelist no longer matches.
    #[error("API key is not valid for this IP address")]
    InvalidIp { message: String },

    /// Any other 403 (bad / revoked key).
    #[error("Access denied by the Clash of Clans API")]
    AccessDenied { message: String },

    #[error("Not found")]
    NotFound { message: String },

    #[error("Rate limited")]
    RateLimited { message: String },

    #[error("API under maintenance")]
    Maintenance { message: String },

    #[error("No internet connection")]
    Offline { message: String },

    #[error("Request timed out")]
    Timeout { message: String },

    #[error("Unexpected API response ({status})")]
    Api { status: u16, message: String },

    #[error("Failed to parse data")]
    Parse { message: String },

    #[error("File error")]
    Io { message: String },
}

impl AppError {
    pub fn not_configured(msg: impl Into<String>) -> Self {
        Self::NotConfigured { message: msg.into() }
    }
    pub fn io(msg: impl Into<String>) -> Self {
        Self::Io { message: msg.into() }
    }
    pub fn parse(msg: impl Into<String>) -> Self {
        Self::Parse { message: msg.into() }
    }

    /// Map a transport-level reqwest failure. We only inspect the error *category*;
    /// its Display can contain the full URL, which is fine here but we still don't
    /// forward it — the category is all the UI needs.
    pub fn from_transport(e: &reqwest::Error) -> Self {
        if e.is_timeout() {
            Self::Timeout { message: "The request took too long. Check your connection and retry.".into() }
        } else if e.is_connect() || e.is_request() {
            Self::Offline { message: "Couldn't reach the server. Are you online?".into() }
        } else if e.is_decode() {
            Self::parse("The server sent data in an unexpected format.")
        } else {
            Self::Offline { message: "Network error while contacting the server.".into() }
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        // io::Error Display contains OS text + kind, never file contents — safe to surface.
        Self::io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        // serde_json errors report line/column and the expected type, not the payload.
        Self::parse(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
