//! Thin wrapper over reqwest for the Supercell API. Status → AppError mapping lives here.

use std::time::Duration;

use serde::Deserialize;

use crate::config::ApiKey;
use crate::errors::{AppError, AppResult};

const BASE_URL: &str = "https://api.clashofclans.com/v1";
const IPIFY_URL: &str = "https://api.ipify.org";

pub fn build_http() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(6))
        .user_agent(concat!("imperator/", env!("CARGO_PKG_VERSION")))
        .build()
        // Only fails if the TLS backend can't initialise — unrecoverable at startup.
        .expect("failed to build HTTP client")
}

/// Supercell's error body: `{ "reason": "accessDenied.invalidIp", "message": "..." }`.
#[derive(Deserialize, Default)]
struct ApiErrorBody {
    #[serde(default)]
    reason: String,
    #[serde(default)]
    message: String,
}

/// GET `{BASE_URL}{path}` and return the raw JSON. `path` must already be URL-encoded.
pub async fn get_json(http: &reqwest::Client, key: &ApiKey, path: &str) -> AppResult<serde_json::Value> {
    let res = http
        .get(format!("{BASE_URL}{path}"))
        // bearer_auth marks the header value as sensitive, so reqwest/hyper won't
        // print it in their own Debug output either.
        .bearer_auth(key.expose())
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| AppError::from_transport(&e))?;

    let status = res.status();
    if status.is_success() {
        return res.json().await.map_err(|e| AppError::from_transport(&e));
    }

    let body: ApiErrorBody = res.json().await.unwrap_or_default();
    Err(match status.as_u16() {
        403 if body.reason == "accessDenied.invalidIp" => AppError::InvalidIp {
            message: "Your public IP isn't on this API key's allow-list.".into(),
        },
        403 => AppError::AccessDenied {
            message: "The API rejected the key. It may be revoked or mistyped.".into(),
        },
        404 => AppError::NotFound {
            message: "Nothing found for that tag. Double-check COC_PLAYER_TAG.".into(),
        },
        429 => AppError::RateLimited {
            message: "Too many requests. Wait a moment and try again.".into(),
        },
        503 => AppError::Maintenance {
            message: "Clash of Clans is under maintenance. Try again later.".into(),
        },
        code => AppError::Api {
            status: code,
            // Supercell's message is a short human string (no secrets); fall back to reason.
            message: if body.message.is_empty() { body.reason } else { body.message },
        },
    })
}

/// Current public IPv4 as seen by ipify — used only for the invalidIp screen.
pub async fn public_ip(http: &reqwest::Client) -> AppResult<String> {
    let res = http.get(IPIFY_URL).send().await.map_err(|e| AppError::from_transport(&e))?;
    if !res.status().is_success() {
        return Err(AppError::Api { status: res.status().as_u16(), message: "ipify request failed".into() });
    }
    let ip = res.text().await.map_err(|e| AppError::from_transport(&e))?;
    let ip = ip.trim();
    // Don't blindly reflect arbitrary text into the UI.
    if ip.parse::<std::net::IpAddr>().is_err() {
        return Err(AppError::parse("ipify returned something that isn't an IP address."));
    }
    Ok(ip.to_owned())
}
