//! Shared app state, managed by Tauri and injected into commands via `State<AppState>`.

use tokio::sync::RwLock;

use crate::cache::ApiCache;
use crate::config::{self, Config, Paths};
use crate::errors::{AppError, AppResult};

pub struct AppState {
    pub http: reqwest::Client,
    pub cache: ApiCache,
    pub paths: Paths,
    /// `Err` is kept (not just `None`) so the UI can show *why* config is missing.
    config: RwLock<AppResult<Config>>,
}

impl AppState {
    pub fn new(paths: Paths) -> Self {
        let config = config::load(&paths);
        Self { http: crate::api::client::build_http(), cache: ApiCache::default(), paths, config: RwLock::new(config) }
    }

    /// Clone of the current config (cheap: two short strings). Returning an owned value
    /// means callers never hold the read guard across an `.await` on the network.
    pub async fn config(&self) -> AppResult<Config> {
        match &*self.config.read().await {
            Ok(c) => Ok(c.clone()),
            Err(AppError::NotConfigured { message }) => Err(AppError::not_configured(message.clone())),
            Err(_) => Err(AppError::not_configured("Configuration could not be loaded.")),
        }
    }

    /// Re-read .env from disk and drop cached responses (tag/key may have changed).
    pub async fn reload(&self) -> AppResult<Config> {
        let fresh = config::load(&self.paths);
        *self.config.write().await = fresh;
        self.cache.clear().await;
        self.config().await
    }
}
